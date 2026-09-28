import { MIN_JWT_SECRET_LENGTH, validateJwtSecret } from "./env.validation.js";

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
