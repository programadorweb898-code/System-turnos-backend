import { Service } from "../../database/entities/service.entity.js";
import { ConfigurationController } from "./configuration.controller.js";
import {
  ConfigurationService,
  ProfessionalNotFoundError,
  ProfessionalServicesNotAssignableError
} from "./configuration.service.js";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_SERVICE_ID = "22222222-2222-4222-8222-222222222222";
const PROFESSIONAL_ID = "33333333-3333-4333-8333-333333333333";

function buildService(id: string, overrides: Partial<Service> = {}): Service {
  return {
    id,
    name: "Corte",
    description: null,
    duration: 30,
    status: "active",
    ...overrides
  } as Service;
}

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: { id: PROFESSIONAL_ID },
    body: {},
    authenticatedUser: {
      id: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN"
    },
    ...overrides
  };
}

describe("ConfigurationController asignaciones de servicios", () => {
  it("lista los servicios asignados usando el tenant autenticado", async () => {
    const configurationService = {
      listProfessionalServices: jest.fn().mockResolvedValue([buildService(SERVICE_ID)])
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.listProfessionalServices(createRequest() as never, response as never);

    expect(configurationService.listProfessionalServices).toHaveBeenCalledWith(
      "tenant-1",
      PROFESSIONAL_ID
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([
      {
        id: SERVICE_ID,
        name: "Corte",
        description: null,
        duration: 30,
        status: "active"
      }
    ]);
  });

  it("devuelve 404 cuando el profesional no pertenece al tenant", async () => {
    const configurationService = {
      listProfessionalServices: jest
        .fn()
        .mockRejectedValue(new ProfessionalNotFoundError("El profesional no existe."))
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.listProfessionalServices(createRequest() as never, response as never);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "PROFESSIONAL_NOT_FOUND",
        message: "El profesional no existe."
      }
    });
  });

  it("rechaza listar sin autenticación", async () => {
    const configurationService = {
      listProfessionalServices: jest.fn()
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.listProfessionalServices(
      { params: { id: PROFESSIONAL_ID } } as never,
      response as never
    );

    expect(configurationService.listProfessionalServices).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("reemplaza las asignaciones y devuelve el conjunto resultante", async () => {
    const configurationService = {
      replaceProfessionalServices: jest
        .fn()
        .mockResolvedValue([buildService(SERVICE_ID), buildService(OTHER_SERVICE_ID)])
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.replaceProfessionalServices(
      createRequest({ body: { serviceIds: [SERVICE_ID, OTHER_SERVICE_ID] } }) as never,
      response as never
    );

    expect(configurationService.replaceProfessionalServices).toHaveBeenCalledWith({
      serviceIds: [SERVICE_ID, OTHER_SERVICE_ID],
      professionalId: PROFESSIONAL_ID,
      tenantId: "tenant-1"
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("ignora un tenantId enviado por el cliente y usa el del contexto", async () => {
    const configurationService = {
      replaceProfessionalServices: jest.fn().mockResolvedValue([])
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.replaceProfessionalServices(
      createRequest({
        body: { serviceIds: [SERVICE_ID], tenantId: "tenant-ajeno" }
      }) as never,
      response as never
    );

    expect(configurationService.replaceProfessionalServices).toHaveBeenCalledWith({
      serviceIds: [SERVICE_ID],
      professionalId: PROFESSIONAL_ID,
      tenantId: "tenant-1"
    });
  });

  it("devuelve 400 cuando algún servicio no pertenece al tenant", async () => {
    const configurationService = {
      replaceProfessionalServices: jest
        .fn()
        .mockRejectedValue(
          new ProfessionalServicesNotAssignableError(
            "Alguno de los servicios indicados no pertenece al negocio."
          )
        )
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.replaceProfessionalServices(
      createRequest({ body: { serviceIds: [SERVICE_ID] } }) as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_REQUEST",
        message: "Alguno de los servicios indicados no pertenece al negocio."
      }
    });
  });

  it("devuelve 400 cuando el cuerpo contiene servicios duplicados", async () => {
    const configurationService = {
      replaceProfessionalServices: jest.fn()
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.replaceProfessionalServices(
      createRequest({ body: { serviceIds: [SERVICE_ID, SERVICE_ID] } }) as never,
      response as never
    );

    expect(configurationService.replaceProfessionalServices).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("devuelve 400 cuando un serviceId no es un identificador válido", async () => {
    const configurationService = {
      replaceProfessionalServices: jest.fn()
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.replaceProfessionalServices(
      createRequest({ body: { serviceIds: ["no-es-uuid"] } }) as never,
      response as never
    );

    expect(configurationService.replaceProfessionalServices).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("acepta un conjunto vacío para dejar al profesional sin servicios", async () => {
    const configurationService = {
      replaceProfessionalServices: jest.fn().mockResolvedValue([])
    };

    const controller = new ConfigurationController(
      configurationService as unknown as ConfigurationService
    );
    const response = createResponseMock();

    await controller.replaceProfessionalServices(
      createRequest({ body: { serviceIds: [] } }) as never,
      response as never
    );

    expect(configurationService.replaceProfessionalServices).toHaveBeenCalledWith({
      serviceIds: [],
      professionalId: PROFESSIONAL_ID,
      tenantId: "tenant-1"
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
