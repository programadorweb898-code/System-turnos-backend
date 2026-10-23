import { DataSource } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Appointment } from "../../database/entities/appointment.entity.js";
import {
  AppointmentManagementRepository,
  ManagedAppointmentNotFoundError,
  ManagedAppointmentStateError,
  ManagedAppointmentUnavailableError
} from "./appointment.management.repository.js";

describe("AppointmentManagementRepository", () => {
  const tenantId = "a1111111-1111-4111-8111-111111111111";
  const otherTenantId = "a2222222-2222-4222-8222-222222222222";
  const serviceId = "b1111111-1111-4111-8111-111111111111";
  const professionalId = "c1111111-1111-4111-8111-111111111111";
  const actorId = "d1111111-1111-4111-8111-111111111111";
  const dataSource = new DataSource({ ...AppDataSource.options, migrations: [] });
  const repository = new AppointmentManagementRepository(dataSource);
  const appointmentRepo = () => dataSource.getRepository(Appointment);
  const at = (day: number, hour: number) => new Date(`2099-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`);

  async function clearAppointments() {
    await dataSource.query(
      "DELETE FROM appointment_changes WHERE tenant_id IN ($1, $2)", [tenantId, otherTenantId]
    );
    await dataSource.query(
      "DELETE FROM appointments WHERE tenant_id IN ($1, $2)", [tenantId, otherTenantId]
    );
    await dataSource.query(
      "DELETE FROM blocked_times WHERE tenant_id IN ($1, $2)", [tenantId, otherTenantId]
    );
  }

  async function createAppointment(startAt: Date, status: Appointment["status"] = "CONFIRMED") {
    return appointmentRepo().save(appointmentRepo().create({
      tenantId, customerName: "Cliente", customerPhone: "+5491100000000",
      customerNotes: null, serviceId, professionalId,
      startAt, endAt: new Date(startAt.getTime() + 30 * 60_000), status
    }));
  }

  beforeAll(async () => {
    await dataSource.initialize();
    await clearAppointments();
    await dataSource.query(
      "DELETE FROM professional_services WHERE tenant_id = $1", [tenantId]
    );
    await dataSource.query("DELETE FROM business_hours WHERE tenant_id = $1", [tenantId]);
    await dataSource.query("DELETE FROM services WHERE tenant_id = $1", [tenantId]);
    await dataSource.query("DELETE FROM employees WHERE tenant_id = $1", [tenantId]);
    await dataSource.query("DELETE FROM tenants WHERE id IN ($1, $2)", [tenantId, otherTenantId]);

    await dataSource.query(
      `INSERT INTO tenants (id, name, slug, timezone, status, max_daily_appointments)
       VALUES ($1, 'Management test', 'management-test', 'UTC', 'published', 5),
              ($2, 'Other management test', 'other-management-test', 'UTC', 'published', 5)`,
      [tenantId, otherTenantId]
    );
    await dataSource.query(
      "INSERT INTO services (id, tenant_id, name, duration, status) VALUES ($1, $2, 'Corte', 30, 'active')",
      [serviceId, tenantId]
    );
    await dataSource.query(
      "INSERT INTO employees (id, tenant_id, name, status) VALUES ($1, $2, 'Profesional', 'active')",
      [professionalId, tenantId]
    );
    await dataSource.query(
      "INSERT INTO professional_services (tenant_id, professional_id, service_id) VALUES ($1, $2, $3)",
      [tenantId, professionalId, serviceId]
    );
    for (let day = 0; day < 7; day++) {
      await dataSource.query(
        "INSERT INTO business_hours (tenant_id, day_of_week, start_time, end_time) VALUES ($1, $2, '09:00', '17:00')",
        [tenantId, day]
      );
    }
  });

  beforeEach(clearAppointments);

  afterAll(async () => {
    await clearAppointments();
    await dataSource.query("DELETE FROM professional_services WHERE tenant_id = $1", [tenantId]);
    await dataSource.query("DELETE FROM business_hours WHERE tenant_id = $1", [tenantId]);
    await dataSource.query("DELETE FROM services WHERE tenant_id = $1", [tenantId]);
    await dataSource.query("DELETE FROM employees WHERE tenant_id = $1", [tenantId]);
    await dataSource.query("DELETE FROM tenants WHERE id IN ($1, $2)", [tenantId, otherTenantId]);
    await dataSource.destroy();
  });

  it("lists only the tenant's appointments and filters by status", async () => {
    const own = await createAppointment(at(1, 10));
    const foreign = await appointmentRepo().save(appointmentRepo().create({
      tenantId: otherTenantId, customerName: "Otro", customerPhone: "123",
      customerNotes: null, serviceId, professionalId,
      startAt: at(1, 11), endAt: at(1, 12), status: "CONFIRMED"
    }));
    const result = await repository.list(tenantId, {
      from: at(1, 9), to: at(2, 9), status: "CONFIRMED", limit: 10, offset: 0
    });
    expect(result.total).toBe(1);
    expect(result.items.map((item) => item.id)).toEqual([own.id]);
    expect(result.items.map((item) => item.id)).not.toContain(foreign.id);
  });

  it("cancels once, records the actor, and releases the slot", async () => {
    const appointment = await createAppointment(at(2, 10));
    const first = await repository.cancel(tenantId, appointment.id, actorId, "Cliente avisó");
    const second = await repository.cancel(tenantId, appointment.id, actorId, "Reintento");
    expect(first.status).toBe("CANCELLED");
    expect(second.status).toBe("CANCELLED");
    const [{ count }] = await dataSource.query(
      "SELECT COUNT(*)::int AS count FROM appointment_changes WHERE appointment_id = $1 AND actor_user_id = $2 AND action = 'CANCELLED'",
      [appointment.id, actorId]
    );
    expect(Number(count)).toBe(1);
    const replacement = await createAppointment(at(2, 10));
    expect(replacement.id).not.toBe(appointment.id);
  });

  it("does not expose another tenant's appointment", async () => {
    const appointment = await createAppointment(at(3, 10));
    await expect(repository.cancel(otherTenantId, appointment.id, actorId, null))
      .rejects.toBeInstanceOf(ManagedAppointmentNotFoundError);
    await expect(repository.reschedule(otherTenantId, appointment.id, actorId, at(3, 12)))
      .rejects.toBeInstanceOf(ManagedAppointmentNotFoundError);
  });

  it("reschedules atomically and records previous and new slot", async () => {
    const appointment = await createAppointment(at(4, 10));
    const updated = await repository.reschedule(tenantId, appointment.id, actorId, at(4, 12));
    expect(updated.id).toBe(appointment.id);
    expect(updated.startAt).toEqual(at(4, 12));
    expect(updated.endAt).toEqual(new Date(at(4, 12).getTime() + 30 * 60_000));
    const [change] = await dataSource.query(
      "SELECT action, previous_start_at, new_start_at FROM appointment_changes WHERE appointment_id = $1",
      [appointment.id]
    );
    expect(change.action).toBe("RESCHEDULED");
    expect(change.previous_start_at).toEqual(at(4, 10));
    expect(change.new_start_at).toEqual(at(4, 12));
    await createAppointment(at(4, 10));
  });

  it("preserves the original slot when the new slot is occupied or blocked", async () => {
    const appointment = await createAppointment(at(5, 10));
    await createAppointment(at(5, 12));
    await expect(repository.reschedule(tenantId, appointment.id, actorId, at(5, 12)))
      .rejects.toBeInstanceOf(ManagedAppointmentUnavailableError);
    await dataSource.query(
      "INSERT INTO blocked_times (tenant_id, professional_id, starts_at, ends_at, reason) VALUES ($1, $2, $3, $4, 'Pausa')",
      [tenantId, professionalId, at(5, 13), at(5, 14)]
    );
    await expect(repository.reschedule(tenantId, appointment.id, actorId, at(5, 13)))
      .rejects.toBeInstanceOf(ManagedAppointmentUnavailableError);
    expect((await appointmentRepo().findOneByOrFail({ id: appointment.id })).startAt).toEqual(at(5, 10));
    const [{ count }] = await dataSource.query(
      "SELECT COUNT(*)::int AS count FROM appointment_changes WHERE appointment_id = $1", [appointment.id]
    );
    expect(Number(count)).toBe(0);
  });

  it("rejects changes to completed appointments", async () => {
    const appointment = await createAppointment(at(6, 10), "COMPLETED");
    await expect(repository.cancel(tenantId, appointment.id, actorId, null))
      .rejects.toBeInstanceOf(ManagedAppointmentStateError);
    await expect(repository.reschedule(tenantId, appointment.id, actorId, at(6, 12)))
      .rejects.toBeInstanceOf(ManagedAppointmentStateError);
  });
});
