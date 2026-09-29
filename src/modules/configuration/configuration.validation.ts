import { z } from "zod";
import {
  CreateBusinessHourInput,
  CreateBlockedTimeInput,
  CreateEmployeeInput,
  CreateServiceInput,
  ReplaceProfessionalServicesInput,
  UpdateEmployeeStatusInput
} from "./configuration.types.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const serviceFieldsSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  duration: z.number().int().positive()
});

export const createServiceRequestSchema = serviceFieldsSchema;

const serviceInputSchema = serviceFieldsSchema.extend({
  tenantId: z.string().min(1)
});

const employeeFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

const employeeInputSchema = employeeFieldsSchema.extend({
  tenantId: z.string().min(1)
});

export const createEmployeeRequestSchema = employeeFieldsSchema;

export const updateEmployeeStatusRequestSchema = z.object({
  status: z.enum(["active", "inactive"])
});

export const createBusinessHourRequestSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TIME_PATTERN),
  endTime: z.string().regex(TIME_PATTERN)
}).refine((input) => input.startTime < input.endTime, {
  message: "La hora de inicio debe ser anterior a la hora de fin."
});

const employeeStatusInputSchema = updateEmployeeStatusRequestSchema.extend({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1)
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const replaceProfessionalServicesRequestSchema = z.object({
  serviceIds: z
    .array(z.string().regex(UUID_PATTERN))
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "No se permiten servicios duplicados."
    })
});

const replaceProfessionalServicesInputSchema = z.object({
  tenantId: z.string().min(1),
  professionalId: z.string().regex(UUID_PATTERN),
  serviceIds: z.array(z.string().regex(UUID_PATTERN)).max(200)
});

export function validateServiceInput(input: CreateServiceInput): void {
  serviceInputSchema.parse(input);
}

export function validateEmployeeInput(input: CreateEmployeeInput): void {
  employeeInputSchema.parse(input);
}

export function validateEmployeeStatusInput(input: UpdateEmployeeStatusInput): void {
  employeeStatusInputSchema.parse(input);
}

export function validateBusinessHourInput(input: CreateBusinessHourInput): void {
  businessHourInputSchema.parse(input);
}

export function validateBlockedTimeInput(input: CreateBlockedTimeInput): void {
  blockedTimeInputSchema.parse(input);
}

export function validateReplaceProfessionalServicesInput(
  input: ReplaceProfessionalServicesInput
): void {
  replaceProfessionalServicesInputSchema.parse(input);
}

export const createBlockedTimeRequestSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().max(300).optional(),
  professionalId: z.string().regex(UUID_PATTERN).nullable().optional()
}).refine((input) => input.startsAt < input.endsAt, {
  message: "El inicio del bloqueo debe ser anterior al fin."
});
