import { TenantController } from "./tenant.controller.js";
import {
  TenantNotReadyError,
  TenantService
} from "./tenant.service.js";

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    authenticatedUser: {
      id: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN"
    },
    ...overrides
  };
}

describe("TenantController publicación", () => {
  it("publica el negocio del tenant autenticado", async () => {
    const tenantService = {
      publish: jest.fn().mockResolvedValue({ status: "published" })
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.publish(createRequest() as never, response as never);

    expect(tenantService.publish).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: "published" });
  });

  it("devuelve 409 con details cuando el negocio no está listo", async () => {
    const tenantService = {
      publish: jest.fn().mockRejectedValue(
        new TenantNotReadyError([
          "Debe existir al menos un servicio activo con duración positiva."
        ])
      )
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.publish(createRequest() as never, response as never);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "TENANT_NOT_READY",
        message: "El negocio todavía no está listo para publicarse.",
        details: ["Debe existir al menos un servicio activo con duración positiva."]
      }
    });
  });

  it("ignora un tenant enviado por el cliente y usa el del contexto", async () => {
    const tenantService = {
      publish: jest.fn().mockResolvedValue({ status: "published" })
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.publish(
      createRequest({ body: { tenantId: "tenant-ajeno" } }) as never,
      response as never
    );

    expect(tenantService.publish).toHaveBeenCalledWith("tenant-1");
  });

  it("rechaza publicar sin autenticación", async () => {
    const tenantService = {
      publish: jest.fn()
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.publish({} as never, response as never);

    expect(tenantService.publish).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("despublica el negocio del tenant autenticado", async () => {
    const tenantService = {
      unpublish: jest.fn().mockResolvedValue({ status: "unpublished" })
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.unpublish(createRequest() as never, response as never);

    expect(tenantService.unpublish).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: "unpublished" });
  });

  it("devuelve 200 al despublicar un negocio ya despublicado", async () => {
    const tenantService = {
      unpublish: jest.fn().mockResolvedValue({ status: "unpublished" })
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.unpublish(createRequest() as never, response as never);

    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("rechaza despublicar sin autenticación", async () => {
    const tenantService = {
      unpublish: jest.fn()
    };

    const controller = new TenantController(tenantService as unknown as TenantService);
    const response = createResponseMock();

    await controller.unpublish({} as never, response as never);

    expect(tenantService.unpublish).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });
});
