import {
  MAX_TRUSTED_PROXY_HOPS,
  MIN_JWT_SECRET_LENGTH,
  parseTrustProxyHops,
  validateJwtSecret
} from "./env.validation.js";

describe("validateJwtSecret", () => {
  it("no exige un secreto largo fuera de producción", () => {
    expect(() => validateJwtSecret("development", "test-secret")).not.toThrow();
  });

  it("rechaza un secreto ausente en producción", () => {
    expect(() => validateJwtSecret("production", "")).toThrow(
      `JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres en producción`
    );
  });

  it("rechaza un secreto demasiado corto en producción", () => {
    expect(() =>
      validateJwtSecret("production", "1234567890123456789012345678901")
    ).toThrow(
      `JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres en producción`
    );
  });

  it("acepta un secreto suficientemente largo en producción", () => {
    const secret = "12345678901234567890123456789012";

    expect(() => validateJwtSecret("production", secret)).not.toThrow();
  });
});

describe("parseTrustProxyHops", () => {
  it("no confia en proxies cuando la variable no esta definida", () => {
    expect(parseTrustProxyHops(undefined)).toBe(0);
  });

  it("no confia en proxies cuando la variable esta vacia", () => {
    expect(parseTrustProxyHops("   ")).toBe(0);
  });

  it("acepta un numero entero de saltos", () => {
    expect(parseTrustProxyHops("1")).toBe(1);
  });

  it("acepta cero para un entorno local detras de un tunel", () => {
    expect(parseTrustProxyHops("0")).toBe(0);
  });

  it("rechaza un numero negativo", () => {
    expect(() => parseTrustProxyHops("-1")).toThrow(
      `TRUST_PROXY_HOPS debe ser un entero entre 0 y ${MAX_TRUSTED_PROXY_HOPS}`
    );
  });

  it("rechaza un valor no numerico", () => {
    expect(() => parseTrustProxyHops("true")).toThrow(
      `TRUST_PROXY_HOPS debe ser un entero entre 0 y ${MAX_TRUSTED_PROXY_HOPS}`
    );
  });

  it("rechaza un valor decimal", () => {
    expect(() => parseTrustProxyHops("1.5")).toThrow(
      `TRUST_PROXY_HOPS debe ser un entero entre 0 y ${MAX_TRUSTED_PROXY_HOPS}`
    );
  });

  it("rechaza una cantidad de saltos excesiva", () => {
    expect(() => parseTrustProxyHops(String(MAX_TRUSTED_PROXY_HOPS + 1))).toThrow(
      `TRUST_PROXY_HOPS debe ser un entero entre 0 y ${MAX_TRUSTED_PROXY_HOPS}`
    );
  });
});
