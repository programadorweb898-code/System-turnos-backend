import { Employee } from "../../database/entities/employee.entity.js";
import { AvailabilityRepository } from "./availability.repository.js";
import { AvailabilityQuery, AvailabilitySlot } from "./availability.types.js";

export class AvailabilityUnavailableError extends Error {}

export class AvailabilityService {
  constructor(
    private readonly repository = new AvailabilityRepository()
  ) {}

  async getAvailability(input: AvailabilityQuery): Promise<AvailabilitySlot[]> {
    const { date } = this.parseDate(input.date);
    const timezone = await this.repository.getTenantTimezone(input.tenantId);

    if (!timezone) {
      throw new AvailabilityUnavailableError(
        "El negocio no está disponible."
      );
    }

    const rangeStart = this.zonedTimeToUtc(
      `${input.date}T00:00:00`,
      timezone
    );

    const context = await this.repository.getContext(
      input.tenantId,
      input.serviceId,
      input.professionalId,
      rangeStart,
      new Date(rangeStart.getTime() + 24 * 60 * 60_000)
    );

    if (!context || context.tenant.status !== "published") {
      throw new AvailabilityUnavailableError(
        "El negocio o el servicio no está disponible."
      );
    }

    if (context.dailyAppointments >= context.tenant.maxDailyAppointments) {
      return [];
    }

    if (context.professionals.length === 0) {
      return [];
    }

    const now = Date.now();
    const minimumNoticeMs =
      context.tenant.minimumBookingNoticeHours * 60 * 60_000;

    const slots: AvailabilitySlot[] = [];

    for (const businessHour of context.businessHours) {
      if (businessHour.dayOfWeek !== date.weekday) continue;

      const open = this.zonedTimeToUtc(
        `${input.date}T${businessHour.startTime.slice(0, 5)}:00`,
        context.tenant.timezone
      );
      const close = this.zonedTimeToUtc(
        `${input.date}T${businessHour.endTime.slice(0, 5)}:00`,
        context.tenant.timezone
      );

      for (
        let startMs = open.getTime();
        startMs + context.service.duration * 60_000 <= close.getTime();
        startMs += 15 * 60_000
      ) {
        const startAt = new Date(startMs);
        const endAt = new Date(
          startMs + context.service.duration * 60_000
        );

        if (startAt.getTime() < now + minimumNoticeMs) continue;

        const blocked = context.blockedTimes.some(
          (blockedTime) =>
            blockedTime.startsAt.getTime() < endAt.getTime() &&
            blockedTime.endsAt.getTime() > startAt.getTime()
        );

        if (blocked) continue;

        const availableProfessionals = context.professionals.filter(
          (professional) =>
            !context.appointments.some(
              (appointment) =>
                appointment.professionalId === professional.id &&
                appointment.startAt.getTime() < endAt.getTime() &&
                appointment.endAt.getTime() > startAt.getTime()
            )
        );

        if (availableProfessionals.length === 0) continue;

        slots.push({
          startAt,
          endAt,
          professionals: availableProfessionals.map(
            (professional) => ({
              id: professional.id,
              name: professional.name
            })
          )
        });
      }
    }

    return slots;
  }

  private parseDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new AvailabilityUnavailableError("La fecha no es válida.");
    }

    return {
      date,
      weekday: date.getUTCDay()
    };
  }

  private zonedTimeToUtc(localDateTime: string, timezone: string): Date {
    const [datePart, timePart] = localDateTime.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    const utcGuess = new Date(
      Date.UTC(year, month - 1, day, hour, minute, second || 0)
    );

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(utcGuess)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)])
    );

    const localAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

    return new Date(utcGuess.getTime() - (localAsUtc - utcGuess.getTime()));
  }
}
