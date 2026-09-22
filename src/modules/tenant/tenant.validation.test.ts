import {
  validateCreateTenantInput,
  validateUpdateTenantInput
} from "./tenant.validation.js";

describe("validación de tenant", () => {
  const validCreateInput = {
    name: "Peluquería Luis",
    slug: "peluqueria-luis",
    timezone: "America/Argentina/Buenos_Aires",
    maxDailyAppointments: 10,
    minimumBookingNoticeHours: 2
  };

  describe("crear tenant", () => {
    it("acepta una configuración válida", () => {
      expect(() => validateCreateTenantInput(validCreateInput)).not.toThrow();
    });

    it("rechaza un nombre vacío", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          name: "   "
        })
      ).toThrow("El campo name es obligatorio.");
    });

    it("rechaza un slug con formato inválido", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          slug: "Peluqueria Luis"
        })
      ).toThrow(
        "El slug debe contener solo letras minúsculas, números y guiones."
      );
    });

    it("rechaza una zona horaria inválida", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          timezone: "Zona/Inventada"
        })
      ).toThrow("La zona horaria no es válida.");
    });

    it("acepta cero como límite diario", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          maxDailyAppointments: 0
        })
      ).not.toThrow();
    });

    it("rechaza un límite diario negativo", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          maxDailyAppointments: -1
        })
      ).toThrow("La cantidad máxima diaria no puede ser negativa.");
    });

    it("rechaza un límite diario decimal", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          maxDailyAppointments: 2.5
        })
      ).toThrow("La cantidad máxima diaria no puede ser negativa.");
    });

    it("acepta cero como anticipación mínima", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          minimumBookingNoticeHours: 0
        })
      ).not.toThrow();
    });

    it("rechaza anticipación mínima negativa", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          minimumBookingNoticeHours: -1
        })
      ).toThrow("La anticipación mínima en horas no puede ser negativa.");
    });

    it("rechaza anticipación mínima decimal", () => {
      expect(() =>
        validateCreateTenantInput({
          ...validCreateInput,
          minimumBookingNoticeHours: 1.5
        })
      ).toThrow("La anticipación mínima en horas no puede ser negativa.");
    });
  });

  describe("actualizar tenant", () => {
    it("acepta una actualización parcial válida", () => {
      expect(() =>
        validateUpdateTenantInput({
          minimumBookingNoticeHours: 3,
          maxDailyAppointments: 15
        })
      ).not.toThrow();
    });

    it("permite actualizar solo el límite diario", () => {
      expect(() =>
        validateUpdateTenantInput({
          maxDailyAppointments: 12
        })
      ).not.toThrow();
    });

    it("permite actualizar solo la anticipación", () => {
      expect(() =>
        validateUpdateTenantInput({
          minimumBookingNoticeHours: 4
        })
      ).not.toThrow();
    });
  });
});
