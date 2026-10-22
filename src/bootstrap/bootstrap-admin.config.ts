import { BootstrapAdminConfig } from "./bootstrap-admin.types.js";
import { BootstrapConfigError, validateBootstrapAdminInput } from "./bootstrap-admin.service.js";

export const BOOTSTRAP_ENV_VARS = {
  businessName: "BOOTSTRAP_BUSINESS_NAME",
  businessSlug: "BOOTSTRAP_BUSINESS_SLUG",
  timezone: "BOOTSTRAP_TIMEZONE",
  adminEmail: "BOOTSTRAP_ADMIN_EMAIL",
  adminPassword: "BOOTSTRAP_ADMIN_PASSWORD"
} as const;

const REQUIRED_ENV_VARS = [
  BOOTSTRAP_ENV_VARS.businessName,
  BOOTSTRAP_ENV_VARS.businessSlug,
  BOOTSTRAP_ENV_VARS.timezone,
  BOOTSTRAP_ENV_VARS.adminEmail,
  BOOTSTRAP_ENV_VARS.adminPassword
] as const;

export type BootstrapEnvSource = Record<string, string | undefined>;

// Se reportan todas las variables faltantes juntas y no la primera: el comando
// se tira por lo general al primer uso y un error por vez obliga a reiniciar
// el proceso cinco veces.
export function readBootstrapConfig(
  source: BootstrapEnvSource
): BootstrapAdminConfig {
  const missing = REQUIRED_ENV_VARS.filter((name) => !source[name]?.trim());

  if (missing.length > 0) {
    throw new BootstrapConfigError(
      `Faltan variables de entorno requeridas: ${missing.join(", ")}.`
    );
  }

  // La contraseña no se recorta: un espacio final puede ser parte del secreto
  // elegido por el operador, y dotenv ya recorta los valores sin comillas.
  const config: BootstrapAdminConfig = {
    businessName: source[BOOTSTRAP_ENV_VARS.businessName]!.trim(),
    businessSlug: source[BOOTSTRAP_ENV_VARS.businessSlug]!.trim(),
    timezone: source[BOOTSTRAP_ENV_VARS.timezone]!.trim(),
    adminEmail: source[BOOTSTRAP_ENV_VARS.adminEmail]!.trim(),
    adminPassword: source[BOOTSTRAP_ENV_VARS.adminPassword]!
  };

  validateBootstrapAdminInput(config);

  return config;
}
