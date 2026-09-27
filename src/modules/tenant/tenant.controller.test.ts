import { Tenant } from "../../database/entities/tenant.entity.js";
import { TenantController } from "./tenant.controller.js";

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

    const controller = new TenantController(tenantService);
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

    const controller = new TenantController(tenantService);
    const response = createResponseMock();

    await controller.getCurrent({} as never, response as never);

    expect(tenantService.getById).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });
});
