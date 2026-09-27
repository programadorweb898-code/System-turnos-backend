import { Service } from "../../database/entities/service.entity.js";
import { ConfigurationController } from "./configuration.controller.js";

describe("ConfigurationController", () => {
  function createResponseMock() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  }

  it("lista serviços do tenant autenticado", async () => {
    const services = [
      {
        id: "service-1",
        name: "Corte",
        description: null,
        duration: 30,
        status: "active"
      }
    ] as Service[];

    const configurationService = {
      listServices: jest.fn().mockResolvedValue(services)
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.listServices(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        }
      } as never,
      response as never
    );

    expect(configurationService.listServices).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([
      {
        id: "service-1",
        name: "Corte",
        description: null,
        duration: 30,
        status: "active"
      }
    ]);
  });

  it("rechaza listar servicios sin autenticación", async () => {
    const configurationService = {
      listServices: jest.fn()
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.listServices({} as never, response as never);

    expect(configurationService.listServices).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("crea un servicio usando el tenant autenticado", async () => {
    const service = {
      id: "service-1",
      name: "Corte",
      description: "Corte clásico",
      duration: 30,
      status: "active"
    } as Service;

    const configurationService = {
      createService: jest.fn().mockResolvedValue(service)
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.createService(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        },
        body: {
          tenantId: "tenant-otro",
          name: "Corte",
          description: "Corte clásico",
          duration: 30
        }
      } as never,
      response as never
    );

    expect(configurationService.createService).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      name: "Corte",
      description: "Corte clásico",
      duration: 30
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("rechaza crear un servicio con datos inválidos", async () => {
    const configurationService = {
      createService: jest.fn()
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.createService(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        },
        body: {
          name: "Corte",
          duration: "30"
        }
      } as never,
      response as never
    );

    expect(configurationService.createService).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });
});
