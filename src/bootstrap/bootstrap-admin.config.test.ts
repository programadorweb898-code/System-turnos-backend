import {
  BOOTSTRAP_ENV_VARS,
  readBootstrapConfig
} from "./bootstrap-admin.config.js";
import { BootstrapConfigError } from "./bootstrap-admin.service.js";

describe("readBootstrapConfig", () => {
  const validEnv = {
    [BOOTSTRAP_ENV_VARS.businessName]: "Peluquería Luis",
    [BOOTSTRAP_ENV_VARS.businessSlug]: "peluqueria-luis",
    [BOOTSTRAP_ENV_VARS.timezone]: "America/Argentina/Buenos_Aires",
    [BOOTSTRAP_ENV_VARS.adminEmail]: "admin@peluqueria-luis.test",
    [BOOTSTRAP_ENV_VARS.adminPassword]: "una-clave-larga-1"
  };

  it("devuelve la configuracion leida del entorno", () => {
    const config = readBootstrapConfig(validEnv);

    expect(config).toEqual({
      businessName: "Peluquería Luis",
      businessSlug: "peluqueria-luis",
      timezone: "America/Argentina/Buenos_Aires",
      adminEmail: "admin@peluqueria-luis.test",
      adminPassword: "una-clave-larga-1"
    });
  });

  it("reporta todas las variables faltantes en un solo error", () => {
    expect(() => readBootstrapConfig({})).toThrow(
      `Faltan variables de entorno requeridas: ${BOOTSTRAP_ENV_VARS.businessName}, ${BOOTSTRAP_ENV_VARS.businessSlug}, ${BOOTSTRAP_ENV_VARS.timezone}, ${BOOTSTRAP_ENV_VARS.adminEmail}, ${BOOTSTRAP_ENV_VARS.adminPassword}.`
    );
  });

  it("reporta solo las variables que faltan", () => {
    const env = {
      ...validEnv,
      [BOOTSTRAP_ENV_VARS.adminPassword]: undefined
    };

    expect(() => readBootstrapConfig(env)).toThrow(
      `Faltan variables de entorno requeridas: ${BOOTSTRAP_ENV_VARS.adminPassword}.`
    );
  });

  it("trata un valor en blanco como variable faltante", () => {
    const env = { ...validEnv, [BOOTSTRAP_ENV_VARS.timezone]: "   " };

    expect(() => readBootstrapConfig(env)).toThrow(
      BOOTSTRAP_ENV_VARS.timezone
    );
  });

  it("recorta los valores de texto menos la contrasena", () => {
    const password = "clave-con-espacios-al-final ";
    const config = readBootstrapConfig({
      ...validEnv,
      [BOOTSTRAP_ENV_VARS.businessName]: "  Peluquería Luis  ",
      [BOOTSTRAP_ENV_VARS.businessSlug]: "  peluqueria-luis  ",
      [BOOTSTRAP_ENV_VARS.timezone]: "  UTC  ",
      [BOOTSTRAP_ENV_VARS.adminEmail]: "  admin@peluqueria-luis.test  ",
      [BOOTSTRAP_ENV_VARS.adminPassword]: password
    });

    expect(config.businessName).toBe("Peluquería Luis");
    expect(config.businessSlug).toBe("peluqueria-luis");
    expect(config.timezone).toBe("UTC");
    expect(config.adminEmail).toBe("admin@peluqueria-luis.test");
    expect(config.adminPassword).toBe(password);
  });

  it("valida el contenido antes de tocar la base de datos", () => {
    expect(() =>
      readBootstrapConfig({
        ...validEnv,
        [BOOTSTRAP_ENV_VARS.businessSlug]: "Peluqueria Luis"
      })
    ).toThrow(BootstrapConfigError);
  });

  it.each([
    BOOTSTRAP_ENV_VARS.adminEmail,
    BOOTSTRAP_ENV_VARS.adminPassword,
    BOOTSTRAP_ENV_VARS.timezone
  ])("rechaza una configuracion invalida en %s", (variable) => {
    const invalidValues: Record<string, string> = {
      [BOOTSTRAP_ENV_VARS.adminEmail]: "no-es-un-email",
      [BOOTSTRAP_ENV_VARS.adminPassword]: "corta",
      [BOOTSTRAP_ENV_VARS.timezone]: "Argentina/Buenos Aires"
    };

    expect(() =>
      readBootstrapConfig({ ...validEnv, [variable]: invalidValues[variable] })
    ).toThrow(BootstrapConfigError);
  });
});
