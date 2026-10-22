import { z } from "zod";
import { CreateTenantInput, UpdateTenantInput } from "./tenant.types.js";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_TENANT_NAME_LENGTH = 120;
export const MAX_TENANT_SLUG_LENGTH = 80;
export const MAX_TENANT_TIMEZONE_LENGTH = 100;

export const SLUG_ERROR_MESSAGE =
  "El slug debe contener solo letras minúsculas, números y guiones.";
export const TIMEZONE_ERROR_MESSAGE = "La zona horaria no es válida.";

// Error propio para que la capa HTTP distinga una entrada invalida de un fallo
// real: los genericos llegarian al manejador global como 500.
export class InvalidTenantInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTenantInputError";
  }
}

export const updateTenantFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El campo name es obligatorio.")
    .max(
      MAX_TENANT_NAME_LENGTH,
      `El nombre no puede superar ${MAX_TENANT_NAME_LENGTH} caracteres.`
    ),
  slug: z
    .string()
    .max(
      MAX_TENANT_SLUG_LENGTH,
      `El slug no puede superar ${MAX_TENANT_SLUG_LENGTH} caracteres.`
    )
    .regex(SLUG_PATTERN, SLUG_ERROR_MESSAGE),
  timezone: z
    .string()
    .max(
      MAX_TENANT_TIMEZONE_LENGTH,
      `La zona horaria no puede superar ${MAX_TENANT_TIMEZONE_LENGTH} caracteres.`
    )
    .refine(isValidTimezone, TIMEZONE_ERROR_MESSAGE),
  maxDailyAppointments: z
    .number()
    .int("La cantidad máxima diaria debe ser un número entero.")
    .min(0, "La cantidad máxima diaria no puede ser negativa."),
  minimumBookingNoticeHours: z
    .number()
    .int("La anticipación mínima en horas debe ser un número entero.")
    .min(0, "La anticipación mínima en horas no puede ser negativa.")
});

export const updateTenantInputSchema = updateTenantFieldsSchema.partial();

// Un cuerpo vacio se rechaza: sin ningun campo que actualizar, un PATCH solo
// reescribiria la misma fila y devolveria un exito engañoso.
export const updateTenantRequestSchema = updateTenantInputSchema.refine(
  (data) => Object.keys(data).length > 0,
  "Debe indicar al menos un campo para actualizar."
);

export function validateCreateTenantInput(input: CreateTenantInput): void {
  validateRequiredText(input.name, "name");
  validateSlug(input.slug);
  validateTimezone(input.timezone);
  validateBookingRules(
    input.maxDailyAppointments,
    input.minimumBookingNoticeHours
  );
}

export function validateUpdateTenantInput(input: UpdateTenantInput): void {
  const result = updateTenantInputSchema.safeParse(input);

  if (!result.success) {
    const issue = result.error.issues[0];

    throw new InvalidTenantInputError(
      issue?.message ?? "Los datos del negocio no son válidos."
    );
  }
}

function validateRequiredText(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidTenantInputError(`El campo ${field} es obligatorio.`);
  }
}

function validateSlug(value: string): void {
  if (!SLUG_PATTERN.test(value)) {
    throw new InvalidTenantInputError(SLUG_ERROR_MESSAGE);
  }
}

function validateTimezone(value: string): void {
  if (!isValidTimezone(value)) {
    throw new InvalidTenantInputError(TIMEZONE_ERROR_MESSAGE);
  }
}

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validateBookingRules(
  maxDailyAppointments: number | undefined,
  minimumBookingNoticeHours: number | undefined
): void {
  const result = updateTenantInputSchema.safeParse({
    maxDailyAppointments,
    minimumBookingNoticeHours
  });

  if (!result.success) {
    const issue = result.error.issues[0];

    throw new InvalidTenantInputError(
      issue?.message ?? "Los datos del negocio no son válidos."
    );
  }
}
