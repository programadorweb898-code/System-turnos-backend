import { CreateTenantInput, UpdateTenantInput } from "./tenant.types.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateCreateTenantInput(input: CreateTenantInput): void {
  validateRequiredText(input.name, "name");
  validateSlug(input.slug);
  validateTimezone(input.timezone);
}

export function validateUpdateTenantInput(input: UpdateTenantInput): void {
  if (input.name !== undefined) validateRequiredText(input.name, "name");
  if (input.slug !== undefined) validateSlug(input.slug);
  if (input.timezone !== undefined) validateTimezone(input.timezone);
}

function validateRequiredText(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`El campo ${field} es obligatorio.`);
  }
}

function validateSlug(value: string): void {
  if (!SLUG_PATTERN.test(value)) {
    throw new Error(
      "El slug debe contener solo letras minúsculas, números y guiones."
    );
  }
}

function validateTimezone(value: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
  } catch {
    throw new Error("La zona horaria no es válida.");
  }
}
