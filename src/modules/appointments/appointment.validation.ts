import { z } from "zod";
import { CreateAppointmentInput } from "./appointment.types.js";

const uuidSchema = z.string().uuid();

export const createAppointmentRequestSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().min(1).max(40),
  customerNotes: z.string().trim().max(300).optional(),
  serviceId: uuidSchema,
  startAt: z.string().datetime({ offset: true }),
  professionalId: uuidSchema.optional()
});

const createAppointmentInputSchema = z.object({
  tenantId: uuidSchema,
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().min(1).max(40),
  customerNotes: z.string().trim().max(300).optional(),
  serviceId: uuidSchema,
  startAt: z.date(),
  professionalId: uuidSchema.optional()
});

export function validateCreateAppointmentInput(input: CreateAppointmentInput): void {
  createAppointmentInputSchema.parse(input);
}
