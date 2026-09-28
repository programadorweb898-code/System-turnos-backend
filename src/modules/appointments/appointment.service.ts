import { Employee } from "../../database/entities/employee.entity.js";
import { Appointment } from "../../database/entities/appointment.entity.js";
import {
  AppointmentDailyLimitError,
  AppointmentProfessionalBlockedError,
  AppointmentRepository
} from "./appointment.repository.js";
import { CreateAppointmentInput } from "./appointment.types.js";
import { validateCreateAppointmentInput } from "./appointment.validation.js";

export class AppointmentConflictError extends Error {}
export class AppointmentNotFoundError extends Error {}
export class AppointmentUnavailableError extends Error {}

export class AppointmentService {
  constructor(private readonly repository = new AppointmentRepository()) {}

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    validateCreateAppointmentInput(input);

    const startAt = input.startAt;
    const context = await this.repository.getCreationContext(input.tenantId, input.serviceId, startAt);

    if (!context) throw new AppointmentUnavailableError("El negocio o el servicio no está disponible.");
    if (context.tenant.status !== "published") {
      throw new AppointmentUnavailableError("El negocio no está disponible para reservas.");
    }

    const endAt = new Date(startAt.getTime() + context.service.duration * 60_000);

    if (context.blocked) throw new AppointmentConflictError("El horario seleccionado está bloqueado.");

    if (!this.isWithinBusinessHours(startAt, endAt, context.businessHours, context.tenant.timezone)) {
      throw new AppointmentUnavailableError("El horario seleccionado está fuera del horario de atención.");
    }

    const minimumNoticeMs = context.tenant.minimumBookingNoticeHours * 60 * 60_000;
    if (startAt.getTime() < Date.now() + minimumNoticeMs) {
      throw new AppointmentUnavailableError("El horario seleccionado no cumple la anticipación mínima requerida.");
    }

    if (context.dailyAppointments >= context.tenant.maxDailyAppointments) {
      throw new AppointmentUnavailableError("El negocio alcanzó el límite diario de turnos.");
    }

    let professional: Employee | undefined;

    if (input.professionalId) {
      professional = context.professionals.find((candidate) => candidate.id === input.professionalId);

      if (!professional) {
        throw new AppointmentUnavailableError("El profesional no está habilitado para este servicio.");
      }

      if (context.blockedProfessionalIds.includes(professional.id)) {
        throw new AppointmentConflictError("El profesional está bloqueado en el horario seleccionado.");
      }

      if (await this.repository.professionalHasConflict(professional.id, startAt, endAt)) {
        throw new AppointmentConflictError("El horario seleccionado ya no está disponible.");
      }
    } else {
      const available = [];

      for (const candidate of context.professionals) {
        if (context.blockedProfessionalIds.includes(candidate.id)) continue;

        if (!(await this.repository.professionalHasConflict(candidate.id, startAt, endAt))) {
          available.push(candidate);
        }
      }

      professional = available[0];

      if (!professional) {
        throw new AppointmentConflictError("No hay profesionales disponibles para el horario seleccionado.");
      }
    }

    try {
      return await this.repository.create({
        tenantId: input.tenantId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        customerNotes: input.customerNotes?.trim() || null,
        serviceId: input.serviceId,
        professionalId: professional.id,
        startAt,
        endAt,
        timezone: context.tenant.timezone,
        maxDailyAppointments: context.tenant.maxDailyAppointments
      });
    } catch (error) {
      if (this.isExclusionConstraintError(error)) {
        throw new AppointmentConflictError("El horario seleccionado ya no está disponible.");
      }
      if (error instanceof AppointmentDailyLimitError) {
        throw new AppointmentUnavailableError("El negocio alcanzó el límite diario de turnos.");
      }
      if (error instanceof AppointmentProfessionalBlockedError) {
        throw new AppointmentConflictError("El profesional está bloqueado en el horario seleccionado.");
      }
      throw error;
    }
  }

  private isWithinBusinessHours(startAt: Date, endAt: Date, businessHours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>, timezone: string): boolean {
    const start = this.getLocalParts(startAt, timezone);
    const end = this.getLocalParts(endAt, timezone);

    if (start.year !== end.year || start.month !== end.month || start.day !== end.day || start.weekday !== end.weekday) {
      return false;
    }

    const intervals = businessHours.filter((hour) => hour.dayOfWeek === start.weekday);
    const startMinutes = start.hour * 60 + start.minute;
    const endMinutes = end.hour * 60 + end.minute;

    return intervals.some((interval) => {
      const openMinutes = this.toMinutes(interval.startTime);
      const closeMinutes = this.toMinutes(interval.endTime);
      return startMinutes >= openMinutes && endMinutes <= closeMinutes;
    });
  }

  private getLocalParts(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, weekday: "short", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
    );

    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    };

    return {
      year: values.year,
      month: values.month,
      day: values.day,
      weekday: weekdayMap[parts.find((part) => part.type === "weekday")?.value ?? ""],
      hour: values.hour,
      minute: values.minute
    };
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  }

  private isExclusionConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "constraint" in error &&
      (error as { constraint?: string }).constraint === "EXCL_appointments_professional_time";
  }
}
