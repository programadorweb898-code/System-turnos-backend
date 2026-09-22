import {
  CreateBusinessHourInput,
  CreateBlockedTimeInput,
  CreateEmployeeInput,
  CreateServiceInput
} from "./configuration.types.js";

const TIME_PATTERN = /^([01]\\d|2[0-3]):[0-5]\\d$/;

export function validateServiceInput(input: CreateServiceInput): void {
  validateRequiredText(input.name, "name");

  if (!Number.isInteger(input.duration) || input.duration <= 0) {
    throw new Error("La duración del servicio debe ser un entero mayor a 0.");
  }
}

export function validateEmployeeInput(input: CreateEmployeeInput): void {
  validateRequiredText(input.name, "name");
}

export function validateBusinessHourInput(input: CreateBusinessHourInput): void {
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new Error("El día de la semana debe estar entre 0 y 6.");
  }

  validateTime(input.startTime, "startTime");
  validateTime(input.endTime, "endTime");

  if (input.startTime >= input.endTime) {
    throw new Error("La hora de inicio debe ser anterior a la hora de fin.");
  }
}

export function validateBlockedTimeInput(input: CreateBlockedTimeInput): void {
  if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) {
    throw new Error("La fecha de inicio del bloqueo no es válida.");
  }

  if (!(input.endsAt instanceof Date) || Number.isNaN(input.endsAt.getTime())) {
    throw new Error("La fecha de fin del bloqueo no es válida.");
  }

  if (input.startsAt >= input.endsAt) {
    throw new Error("El inicio del bloqueo debe ser anterior al fin.");
  }
}

function validateRequiredText(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`El campo ${field} es obligatorio.`);
  }
}

function validateTime(value: string, field: string): void {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`El campo ${field} debe tener formato HH:mm.`);
  }
}
