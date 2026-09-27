import {
  createEmployeeRequestSchema,
  updateEmployeeStatusRequestSchema
} from "./configuration.validation.js";

describe("configuration employee validation", () => {
  it("acepta un nombre válido y lo normaliza con trim", () => {
    const result = createEmployeeRequestSchema.safeParse({ name: " Juan " });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Juan");
    }
  });

  it("rechaza un nombre vacío", () => {
    const result = createEmployeeRequestSchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
  });

  it("rechaza un nombre de más de 120 caracteres", () => {
    const result = createEmployeeRequestSchema.safeParse({
      name: "a".repeat(121)
    });

    expect(result.success).toBe(false);
  });

  it("acepta solo estados active e inactive", () => {
    expect(updateEmployeeStatusRequestSchema.safeParse({ status: "active" }).success).toBe(true);
    expect(updateEmployeeStatusRequestSchema.safeParse({ status: "inactive" }).success).toBe(true);
    expect(updateEmployeeStatusRequestSchema.safeParse({ status: "disabled" }).success).toBe(false);
  });
});
