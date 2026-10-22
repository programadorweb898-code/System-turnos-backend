export const MIN_JWT_SECRET_LENGTH = 32;

export const MAX_TRUSTED_PROXY_HOPS = 5;

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

export function parseTrustProxyHops(rawValue: string | undefined): number {
  if (rawValue === undefined || rawValue.trim() === "") {
    return 0;
  }

  const hops = Number(rawValue);

  if (!Number.isInteger(hops) || hops < 0 || hops > MAX_TRUSTED_PROXY_HOPS) {
    throw new Error(
      `TRUST_PROXY_HOPS debe ser un entero entre 0 y ${MAX_TRUSTED_PROXY_HOPS}`
    );
  }

  return hops;
}
