import { DataSource, EntityManager } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Appointment, AppointmentStatus } from "../../database/entities/appointment.entity.js";
import { BlockedTime } from "../../database/entities/blocked-time.entity.js";
import { BusinessHour } from "../../database/entities/business-hour.entity.js";
import { Employee } from "../../database/entities/employee.entity.js";
import { ProfessionalService } from "../../database/entities/professional-service.entity.js";
import { Service } from "../../database/entities/service.entity.js";
import { Tenant } from "../../database/entities/tenant.entity.js";
import { isWithinBusinessHours } from "./appointment.time.js";
import { enqueueAppointmentNotification } from "./appointment.notification-outbox.js";

export class ManagedAppointmentNotFoundError extends Error {}
export class ManagedAppointmentStateError extends Error {}
export class ManagedAppointmentUnavailableError extends Error {}

export interface AppointmentListQuery {
  from: Date;
  to: Date;
  status?: AppointmentStatus;
  limit: number;
  offset: number;
}

export interface AppointmentListResult {
  items: Appointment[];
  total: number;
}

export class AppointmentManagementRepository {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async list(tenantId: string, query: AppointmentListQuery): Promise<AppointmentListResult> {
    const builder = this.dataSource.getRepository(Appointment)
      .createQueryBuilder("appointment")
      .where("appointment.tenant_id = :tenantId", { tenantId })
      .andWhere("appointment.start_at >= :from", { from: query.from })
      .andWhere("appointment.start_at < :to", { to: query.to });

    if (query.status) {
      builder.andWhere("appointment.status = :status", { status: query.status });
    }

    const [items, total] = await builder
      .orderBy("appointment.start_at", "ASC")
      .addOrderBy("appointment.id", "ASC")
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return { items, total };
  }

  async cancel(
    tenantId: string,
    appointmentId: string,
    actorUserId: string | null,
    reason: string | null,
    tokenHash?: string
  ): Promise<Appointment> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockTenant(manager, tenantId);
      const appointment = await this.findForUpdate(manager, tenantId, appointmentId);
      if (tokenHash) await this.authorizeToken(manager, tenantId, appointmentId, tokenHash);

      if (appointment.status === "CANCELLED") return appointment;
      this.requireFutureActiveAppointment(appointment);

      const before = this.snapshot(appointment);
      appointment.status = "CANCELLED";
      const updated = await manager.getRepository(Appointment).save(appointment);
      await this.recordChange(manager, tenantId, updated.id, actorUserId, "CANCELLED", reason, before, updated);
      await enqueueAppointmentNotification(manager, updated, "appointment.cancelled");
      await manager.query(
        "UPDATE appointment_access_tokens SET expires_at = LEAST(expires_at, now() + interval '24 hours') WHERE appointment_id = $1",
        [updated.id]
      );
      return updated;
    });
  }

  async reschedule(
    tenantId: string,
    appointmentId: string,
    actorUserId: string | null,
    startAt: Date,
    requestedProfessionalId?: string,
    tokenHash?: string
  ): Promise<Appointment> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockTenant(manager, tenantId);
        const appointment = await this.findForUpdate(manager, tenantId, appointmentId);
        if (tokenHash) await this.authorizeToken(manager, tenantId, appointmentId, tokenHash);
        this.requireFutureActiveAppointment(appointment);

        const professionalId = requestedProfessionalId ?? appointment.professionalId;
        if (appointment.startAt.getTime() === startAt.getTime() &&
            appointment.professionalId === professionalId) {
          return appointment;
        }

        const tenant = await manager.getRepository(Tenant).findOneBy({ id: tenantId });
        const service = await manager.getRepository(Service).findOneBy({
          id: appointment.serviceId, tenantId, status: "active"
        });
        const professional = await manager.getRepository(Employee).findOneBy({
          id: professionalId, tenantId, status: "active"
        });
        const assignment = await manager.getRepository(ProfessionalService).findOneBy({
          tenantId, serviceId: appointment.serviceId, professionalId
        });

        if (!tenant || tenant.status !== "published" || !service || !professional || !assignment) {
          throw new ManagedAppointmentUnavailableError("El negocio, servicio o profesional no está disponible.");
        }

        const endAt = new Date(startAt.getTime() + service.duration * 60_000);
        if (startAt.getTime() < Date.now() + tenant.minimumBookingNoticeHours * 3_600_000) {
          throw new ManagedAppointmentUnavailableError("El horario no cumple la anticipación mínima.");
        }

        const hours = await manager.getRepository(BusinessHour).findBy({ tenantId });
        if (!isWithinBusinessHours(startAt, endAt, hours, tenant.timezone)) {
          throw new ManagedAppointmentUnavailableError("El horario está fuera del horario de atención.");
        }

        const blocked = await manager.getRepository(BlockedTime)
          .createQueryBuilder("blocked")
          .where("blocked.tenant_id = :tenantId", { tenantId })
          .andWhere("(blocked.professional_id IS NULL OR blocked.professional_id = :professionalId)", { professionalId })
          .andWhere("blocked.starts_at < :endAt", { endAt })
          .andWhere("blocked.ends_at > :startAt", { startAt })
          .getExists();
        if (blocked) {
          throw new ManagedAppointmentUnavailableError("El horario seleccionado está bloqueado.");
        }

        const dailyCount = await manager.getRepository(Appointment)
          .createQueryBuilder("appointment")
          .where("appointment.tenant_id = :tenantId", { tenantId })
          .andWhere("appointment.id <> :appointmentId", { appointmentId })
          .andWhere("appointment.status IN ('PENDING', 'CONFIRMED')")
          .andWhere("appointment.start_at >= (date_trunc('day', :instant::timestamptz AT TIME ZONE :timezone) AT TIME ZONE :timezone)", { instant: startAt, timezone: tenant.timezone })
          .andWhere("appointment.start_at < ((date_trunc('day', :instant::timestamptz AT TIME ZONE :timezone) + interval '1 day') AT TIME ZONE :timezone)", { instant: startAt, timezone: tenant.timezone })
          .getCount();
        if (dailyCount >= tenant.maxDailyAppointments) {
          throw new ManagedAppointmentUnavailableError("El negocio alcanzó el límite diario de turnos.");
        }

        const before = this.snapshot(appointment);
        appointment.startAt = startAt;
        appointment.endAt = endAt;
        appointment.professionalId = professionalId;
        const updated = await manager.getRepository(Appointment).save(appointment);
        await this.recordChange(manager, tenantId, updated.id, actorUserId, "RESCHEDULED", null, before, updated);
        await enqueueAppointmentNotification(manager, updated, "appointment.rescheduled");
        await manager.query(
          "UPDATE appointment_access_tokens SET expires_at = $2 WHERE appointment_id = $1",
          [updated.id, new Date(updated.startAt.getTime() + 24 * 3_600_000)]
        );
        return updated;
      });
    } catch (error) {
      if (this.isOverlapConstraint(error)) {
        throw new ManagedAppointmentUnavailableError("El nuevo horario ya no está disponible.");
      }
      throw error;
    }
  }

  private async authorizeToken(
    manager: EntityManager, tenantId: string, appointmentId: string, tokenHash: string
  ): Promise<void> {
    const rows: Array<{ appointment_id: string }> = await manager.query(
      `SELECT appointment_id FROM appointment_access_tokens
       WHERE appointment_id = $1 AND tenant_id = $2 AND token_hash = $3
         AND revoked_at IS NULL AND expires_at > now() FOR UPDATE`,
      [appointmentId, tenantId, tokenHash]
    );
    if (rows.length !== 1) throw new ManagedAppointmentNotFoundError("El turno no existe.");
  }

  private async lockTenant(manager: EntityManager, tenantId: string): Promise<void> {
    // Same lock as booking and blocked-time creation.
    await manager.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      "booking-and-blocked-time:" + tenantId
    ]);
  }

  private async findForUpdate(
    manager: EntityManager,
    tenantId: string,
    appointmentId: string
  ): Promise<Appointment> {
    const appointment = await manager.getRepository(Appointment)
      .createQueryBuilder("appointment")
      .setLock("pessimistic_write")
      .where("appointment.id = :appointmentId", { appointmentId })
      .andWhere("appointment.tenant_id = :tenantId", { tenantId })
      .getOne();
    if (!appointment) throw new ManagedAppointmentNotFoundError("El turno no existe.");
    return appointment;
  }

  private requireFutureActiveAppointment(appointment: Appointment): void {
    if (!["PENDING", "CONFIRMED"].includes(appointment.status) ||
        appointment.startAt.getTime() <= Date.now()) {
      throw new ManagedAppointmentStateError("El turno ya no admite cambios.");
    }
  }

  private snapshot(appointment: Appointment) {
    return {
      status: appointment.status,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      professionalId: appointment.professionalId
    };
  }

  private async recordChange(
    manager: EntityManager,
    tenantId: string,
    appointmentId: string,
    actorUserId: string | null,
    action: "CANCELLED" | "RESCHEDULED",
    reason: string | null,
    before: ReturnType<AppointmentManagementRepository["snapshot"]>,
    after: Appointment
  ): Promise<void> {
    await manager.query(
      `INSERT INTO appointment_changes (
        tenant_id, appointment_id, actor_user_id, actor_type, action, reason,
        previous_status, new_status, previous_start_at, previous_end_at,
        new_start_at, new_end_at, previous_professional_id, new_professional_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        tenantId, appointmentId, actorUserId, actorUserId ? "ADMIN" : "CLIENT", action, reason,
        before.status, after.status, before.startAt, before.endAt,
        after.startAt, after.endAt, before.professionalId, after.professionalId
      ]
    );
  }

  private isOverlapConstraint(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;
    const constraint = (error as {
      constraint?: string;
      driverError?: { constraint?: string };
    }).constraint ?? (error as { driverError?: { constraint?: string } }).driverError?.constraint;
    return constraint === "EXCL_appointments_professional_time";
  }
}
