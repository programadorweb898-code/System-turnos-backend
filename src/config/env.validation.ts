export const MIN_JWT_SECRET_LENGTH = 32;

export function validateJwtSecret(
  nodeEnv: string,
  jwtSecret: string
): void {
  if (nodeEnv !== "production") {
    return;
  }

  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres en producción`
    );
  }
}
