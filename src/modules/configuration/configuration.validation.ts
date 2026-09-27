import { z } from "zod";
import {
  CreateBusinessHourInput,
  CreateBlockedTimeInput,
  CreateEmployeeInput,
  CreateServiceInput
} from "./configuration.types.js";

const TIME_PATTERN = /^([01]\\d|2[0-3]):[0-5]\\d$/;

const serviceFieldsSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  duration: z.number().int().positive()
});

export const createServiceRequestSchema = serviceFieldsSchema;

const serviceInputSchema = serviceFieldsSchema.extend({
  tenantId: z.string().min(1)
});

const employeeInputSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(1)
});

const businessHourInputSchema = z.object({
  tenantId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TIME_PATTERN),
  endTime: z.string().regex(TIME_PATTERN)
}).refine((input) => input.startTime < input.endTime, {
  message: "La hora de inicio debe ser anterior a la hora de fin."
});

const blockedTimeInputSchema = z.object({
  tenantId: z.string().min(1),
  startsAt: z.date().refine((date) => !Number.isNaN(date.getTime())),
  endsAt: z.date().refine((date) => !Number.isNaN(date.getTime())),
  reason: z.string().optional()
}).refine((input) => input.startsAt < input.endsAt, {
  message: "El inicio del bloqueo debe ser anterior al fin."
});

export function validateServiceInput(input: CreateServiceInput): void {
  serviceInputSchema.parse(input);
}

export function validateEmployeeInput(input: CreateEmployeeInput): void {
  employeeInputSchema.parse(input);
}

export function validateBusinessHourInput(input: CreateBusinessHourInput): void {
  businessHourInputSchema.parse(input);
}

export function validateBlockedTimeInput(input: CreateBlockedTimeInput): void {
  blockedTimeInputSchema.parse(input);
}
