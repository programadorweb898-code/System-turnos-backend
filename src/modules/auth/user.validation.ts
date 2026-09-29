import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_BYTES = 72;
export const MAX_EMAIL_LENGTH = 255;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_ERROR_MESSAGE = "El email no es válido.";

// El login busca por esta misma forma (trim + minusculas), asi que el alta
// normaliza tambien: si no, un email guardado con mayusculas pasaria el
// chequeo de duplicados y el login no lo encontraria.
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .refine(
    (value) => value.length <= MAX_EMAIL_LENGTH,
    `El email no puede superar ${MAX_EMAIL_LENGTH} caracteres.`
  )
  .refine((value) => EMAIL_PATTERN.test(value), EMAIL_ERROR_MESSAGE);

// bcrypt solo considera los primeros 72 bytes de la contraseña: lo que exceda
// se descarta en silencio, asi que un limite explicito es mejor que un hash
// que no coincide con lo que el operador cree que guardo.
export const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  )
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES,
    `La contraseña no puede superar ${MAX_PASSWORD_BYTES} bytes.`
  );

export const userCredentialsFieldsSchema = {
  email: emailSchema,
  password: passwordSchema
};

export const createUserRequestSchema = z.object(userCredentialsFieldsSchema);

export const createUserInputSchema = z.object({
  ...userCredentialsFieldsSchema,
  tenantId: z.string().min(1)
});
