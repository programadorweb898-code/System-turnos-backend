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
  it("lista profesionales del tenant autenticado", async () => {
    const employees = [
      {
        id: "employee-1",
        name: "Juan",
        status: "active"
      }
    ];

    const configurationService = {
      listEmployees: jest.fn().mockResolvedValue(employees)
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.listEmployees(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        }
      } as never,
      response as never
    );

    expect(configurationService.listEmployees).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(employees);
  });

  it("crea un profesional usando el tenant autenticado", async () => {
    const employee = {
      id: "employee-1",
      name: "Juan",
      status: "active"
    };

    const configurationService = {
      createEmployee: jest.fn().mockResolvedValue(employee)
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.createEmployee(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        },
        body: {
          tenantId: "tenant-otro",
          name: " Juan "
        }
      } as never,
      response as never
    );

    expect(configurationService.createEmployee).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      name: "Juan"
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("rechaza crear un profesional sin nombre válido", async () => {
    const configurationService = {
      createEmployee: jest.fn()
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.createEmployee(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        },
        body: { name: "   " }
      } as never,
      response as never
    );

    expect(configurationService.createEmployee).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("actualiza el estado de un profesional del tenant autenticado", async () => {
    const employee = {
      id: "employee-1",
      name: "Juan",
      status: "inactive"
    };

    const configurationService = {
      updateEmployeeStatus: jest.fn().mockResolvedValue(employee)
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.updateEmployeeStatus(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        },
        params: { id: "employee-1" },
        body: { status: "inactive" }
      } as never,
      response as never
    );

    expect(configurationService.updateEmployeeStatus).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      employeeId: "employee-1",
      status: "inactive"
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("devuelve 404 si el profesional no pertenece al tenant", async () => {
    const configurationService = {
      updateEmployeeStatus: jest.fn().mockResolvedValue(null)
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.updateEmployeeStatus(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        },
        params: { id: "employee-otro" },
        body: { status: "inactive" }
      } as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(404);
  });

  it("rechaza un estado de profesional inválido", async () => {
    const configurationService = {
      updateEmployeeStatus: jest.fn()
    };

    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.updateEmployeeStatus(
      {
        authenticatedUser: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "ADMIN"
        },
        params: { id: "employee-1" },
        body: { status: "deleted" }
      } as never,
      response as never
    );

    expect(configurationService.updateEmployeeStatus).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });

});


describe("ConfigurationController - business hours", () => {
  function createResponseMock() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  }

  it("lista horarios del tenant autenticado", async () => {
    const businessHours = [
      {
        id: "hour-1",
        dayOfWeek: 1,
        startTime: "09:00:00",
        endTime: "17:00:00"
      }
    ];
    const configurationService = {
      listBusinessHours: jest.fn().mockResolvedValue(businessHours)
    };
    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.listBusinessHours({
      authenticatedUser: { id: "user-1", tenantId: "tenant-1", role: "ADMIN" }
    } as never, response as never);

    expect(configurationService.listBusinessHours).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([
      { id: "hour-1", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }
    ]);
  });

  it("rechaza listar horarios sin autenticación", async () => {
    const configurationService = { listBusinessHours: jest.fn() };
    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.listBusinessHours({} as never, response as never);

    expect(configurationService.listBusinessHours).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("crea un horario usando el tenant autenticado e ignora tenantId del body", async () => {
    const businessHour = {
      id: "hour-1",
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "17:00:00"
    };
    const configurationService = {
      createBusinessHour: jest.fn().mockResolvedValue(businessHour)
    };
    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.createBusinessHour({
      authenticatedUser: { id: "user-1", tenantId: "tenant-1", role: "ADMIN" },
      body: {
        tenantId: "tenant-otro",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00"
      }
    } as never, response as never);

    expect(configurationService.createBusinessHour).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00"
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("rechaza crear un horario inválido", async () => {
    const configurationService = { createBusinessHour: jest.fn() };
    const controller = new ConfigurationController(configurationService);
    const response = createResponseMock();

    await controller.createBusinessHour({
      authenticatedUser: { id: "user-1", tenantId: "tenant-1", role: "ADMIN" },
      body: { dayOfWeek: 1, startTime: "17:00", endTime: "09:00" }
    } as never, response as never);

    expect(configurationService.createBusinessHour).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });
});
