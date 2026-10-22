import {
  emailSchema,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  passwordSchema
} from "./user.validation.js";

describe("validación de credenciales de usuario", () => {
  describe("emailSchema", () => {
    it("normaliza el email a minúsculas sin espacios", () => {
      const result = emailSchema.safeParse("  Admin@Peluqueria-Luis.TEST  ");

      expect(result.success).toBe(true);
      expect(result.data).toBe("admin@peluqueria-luis.test");
    });

    it("acepta un email válido", () => {
      expect(emailSchema.safeParse("admin@example.test").success).toBe(true);
    });

    it.each([
      ["sin arroba", "admin.example.test"],
      ["sin dominio", "admin@"],
      ["sin parte local", "@example.test"],
      ["con espacios", "admin@example .test"]
    ])("rechaza un email %s", (_case, value) => {
      expect(emailSchema.safeParse(value).success).toBe(false);
    });

    it("rechaza un email más largo que la columna de la base", () => {
      const value = `${"a".repeat(MAX_EMAIL_LENGTH)}@example.test`;

      const result = emailSchema.safeParse(value);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(
        `${MAX_EMAIL_LENGTH} caracteres`
      );
    });
  });

  describe("passwordSchema", () => {
    it("acepta una contraseña con el mínimo de caracteres", () => {
      expect(
        passwordSchema.safeParse("a".repeat(MIN_PASSWORD_LENGTH)).success
      ).toBe(true);
    });

    it("rechaza una contraseña más corta que el mínimo", () => {
      const result = passwordSchema.safeParse("a".repeat(MIN_PASSWORD_LENGTH - 1));

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(
        `al menos ${MIN_PASSWORD_LENGTH} caracteres`
      );
    });

    it("acepta una contraseña de exactamente 72 bytes", () => {
      expect(passwordSchema.safeParse("a".repeat(MAX_PASSWORD_BYTES)).success).toBe(
        true
      );
    });

    it("rechaza una contraseña que excede el límite de bytes de bcrypt", () => {
      const result = passwordSchema.safeParse("a".repeat(MAX_PASSWORD_BYTES + 1));

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(
        `${MAX_PASSWORD_BYTES} bytes`
      );
    });

    it("mide el límite en bytes y no en caracteres", () => {
      // 25 caracteres de 3 bytes cada uno: pasa el mínimo de caracteres pero no
      // el de bytes, que es el que bcrypt respeta.
      const value = "ñ".repeat(MAX_PASSWORD_BYTES / 2 + 1);

      expect(value.length).toBeLessThanOrEqual(MAX_PASSWORD_BYTES);
      expect(Buffer.byteLength(value, "utf8")).toBeGreaterThan(MAX_PASSWORD_BYTES);
      expect(passwordSchema.safeParse(value).success).toBe(false);
    });
  });

  it("normalizeEmail coincide con la normalización del esquema", () => {
    expect(normalizeEmail("  Admin@Example.TEST ")).toBe(
      emailSchema.parse("  Admin@Example.TEST ")
    );
  });
});
