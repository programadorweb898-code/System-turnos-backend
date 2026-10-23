import { z } from "zod";
import { APPOINTMENT_STATUSES } from "../../database/entities/appointment.entity.js";

const instant = z.string().datetime({ offset: true });
const uuid = z.string().uuid();

export const listAppointmentsSchema = z.object({
  from: instant,
  to: instant,
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
}).refine((value) => new Date(value.from) < new Date(value.to));

export const appointmentIdSchema = uuid;

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(300).optional()
});

export const rescheduleAppointmentSchema = z.object({
  startAt: instant,
  professionalId: uuid.optional()
});
