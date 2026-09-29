import { Tenant } from "../../database/entities/tenant.entity.js";
import { TenantController } from "./tenant.controller.js";
import {
  TenantNotFoundError,
  TenantService,
  TenantSlugAlreadyExistsError
} from "./tenant.service.js";
import { InvalidTenantInputError } from "./tenant.validation.js";

describe("TenantController", () => {
  function createResponseMock() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  }

  it("obtiene el tenant desde el usuario autenticado", async () => {
    const tenant = {
      id: "tenant-1",
      name: "Peluquería Luis",
      slug: "peluqueria-luis",
      timezone: "America/Argentina/Buenos_Aires",
      status: "draft",
      maxDailyAppointments: 10,
      minimumBookingNoticeHours: 2
    } as Tenant;

    const tenantService = {
      getById: jest.fn().mockResolvedValue(tenant)
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.getCurrent(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        }
      } as never,
      response as never
    );

    expect(tenantService.getById).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      id: "tenant-1",
      name: "Peluquería Luis",
      slug: "peluqueria-luis",
      timezone: "America/Argentina/Buenos_Aires",
      status: "draft",
      maxDailyAppointments: 10,
      minimumBookingNoticeHours: 2
    });
  });

  it("rechaza el acceso si no existe contexto autenticado", async () => {
    const tenantService = {
      getById: jest.fn()
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.getCurrent({} as never, response as never);

    expect(tenantService.getById).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  describe("update", () => {
    const updatedTenant = {
      id: "tenant-1",
      name: "Peluquería Luis",
      slug: "peluqueria-luis",
      timezone: "America/Argentina/Buenos_Aires",
      status: "draft",
      maxDailyAppointments: 15,
      minimumBookingNoticeHours: 2
    } as Tenant;

    function createUpdateRequestMock(body: unknown) {
      return {
        body,
        authenticatedUser: { id: "user-1", tenantId: "tenant-1", role: "ADMIN" }
      } as never;
    }

    it("actualiza el negocio del token con los campos indicados", async () => {
      const tenantService = {
        update: jest.fn().mockResolvedValue(updatedTenant)
      };
      const controller = new TenantController(
        tenantService as unknown as TenantService
      );
      const response = createResponseMock();

      await controller.update(
        createUpdateRequestMock({ maxDailyAppointments: 15 }),
        response as never
      );

      expect(tenantService.update).toHaveBeenCalledWith("tenant-1", {
        maxDailyAppointments: 15
      });
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        id: "tenant-1",
        name: "Peluquería Luis",
        slug: "peluqueria-luis",
        timezone: "America/Argentina/Buenos_Aires",
        status: "draft",
        maxDailyAppointments: 15,
        minimumBookingNoticeHours: 2
      });
    });

    it("devuelve 401 sin usuario autenticado", async () => {
      const tenantService = { update: jest.fn() };
      const controller = new TenantController(
        tenantService as unknown as TenantService
      );
      const response = createResponseMock();

      await controller.update({ body: {} } as never, response as never);

      expect(tenantService.update).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(401);
    });

    it.each([
      ["cuerpo vacío", {}],
      ["slug inválido", { slug: "Peluquería Luis" }],
      ["zona horaria inválida", { timezone: "Argentina/Buenos Aires" }],
      ["límite diario negativo", { maxDailyAppointments: -1 }],
      ["nombre vacío", { name: "   " }]
    ])("devuelve 400 con %s", async (_case, body) => {
      const tenantService = { update: jest.fn() };
      const controller = new TenantController(
        tenantService as unknown as TenantService
      );
      const response = createResponseMock();

      await controller.update(createUpdateRequestMock(body), response as never);

      expect(tenantService.update).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos del negocio no son válidos."
        }
      });
    });

    it("devuelve 409 cuando el slug ya está en uso", async () => {
      const tenantService = {
        update: jest.fn().mockRejectedValue(new TenantSlugAlreadyExistsError())
      };
      const controller = new TenantController(
        tenantService as unknown as TenantService
      );
      const response = createResponseMock();

      await controller.update(
        createUpdateRequestMock({ slug: "peluqueria-luis" }),
        response as never
      );

      expect(response.status).toHaveBeenCalledWith(409);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: "SLUG_ALREADY_EXISTS",
          message: "Ya existe un negocio con ese slug."
        }
      });
    });

    it("devuelve 400 cuando el servicio rechaza la actualización", async () => {
      const tenantService = {
        update: jest.fn().mockRejectedValue(new InvalidTenantInputError("slug inválido"))
      };
      const controller = new TenantController(
        tenantService as unknown as TenantService
      );
      const response = createResponseMock();

      await controller.update(
        createUpdateRequestMock({ slug: "peluqueria-luis" }),
        response as never
      );

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_REQUEST",
          message: "slug inválido"
        }
      });
    });

    it("devuelve 404 cuando el negocio del token ya no existe", async () => {
      const tenantService = {
        update: jest.fn().mockRejectedValue(new TenantNotFoundError())
      };
      const controller = new TenantController(
        tenantService as unknown as TenantService
      );
      const response = createResponseMock();

      await controller.update(
        createUpdateRequestMock({ name: "Peluquería Luis" }),
        response as never
      );

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: "TENANT_NOT_FOUND",
          message: "El negocio no existe."
        }
      });
    });
  });
});
