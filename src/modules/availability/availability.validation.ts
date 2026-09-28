import { z } from "zod";
import { AvailabilityQuery } from "./availability.types.js";

const uuidSchema = z.string().uuid();

export const availabilityRequestSchema = z.object({
  serviceId: uuidSchema,
  date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  professionalId: uuidSchema.optional()
});

export function parseAvailabilityRequest(input: unknown): Omit<AvailabilityQuery, "tenantId"> {
  return availabilityRequestSchema.parse(input);
}
