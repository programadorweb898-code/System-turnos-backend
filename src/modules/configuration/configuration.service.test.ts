import { ConfigurationService } from "./configuration.service.js";
import { ConfigurationRepository } from "./configuration.repository.js";

describe("ConfigurationService - configuration", () => {
  it("crea un profesional con el tenant recibido", async () => {
    const repository = {
      createEmployee: jest.fn().mockResolvedValue({
        id: "employee-1",
        tenantId: "tenant-1",
        name: "Juan",
        status: "active"
      })
    };

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await service.createEmployee({
      tenantId: "tenant-1",
      name: " Juan "
    });

    expect(repository.createEmployee).toHaveBeenCalledWith(
      "tenant-1",
      "Juan"
    );
  });

  it("actualiza el estado usando tenant e id del profesional", async () => {
    const repository = {
      updateEmployeeStatus: jest.fn().mockResolvedValue({
        id: "employee-1",
        tenantId: "tenant-1",
        name: "Juan",
        status: "inactive"
      })
    };

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await service.updateEmployeeStatus({
      tenantId: "tenant-1",
      employeeId: "employee-1",
      status: "inactive"
    });

    expect(repository.updateEmployeeStatus).toHaveBeenCalledWith(
      "tenant-1",
      "employee-1",
      "inactive"
    );
  });

  it("no permite un estado inválido", async () => {
    const repository = {
      updateEmployeeStatus: jest.fn()
    };

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.updateEmployeeStatus({
        tenantId: "tenant-1",
        employeeId: "employee-1",
        status: "deleted" as never
      })
    ).rejects.toThrow();

    expect(repository.updateEmployeeStatus).not.toHaveBeenCalled();
  });
});


describe("ConfigurationService - business hours", () => {
  it("crea un horario usando el tenant recibido", async () => {
    const repository = {
      createBusinessHour: jest.fn().mockResolvedValue({
        id: "hour-1",
        tenantId: "tenant-1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00"
      })
    };

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await service.createBusinessHour({
      tenantId: "tenant-1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00"
    });

    expect(repository.createBusinessHour).toHaveBeenCalledWith(
      "tenant-1",
      1,
      "09:00",
      "17:00"
    );
  });

  it("rechaza un horario inválido antes de acceder al repositorio", async () => {
    const repository = {
      createBusinessHour: jest.fn()
    };

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(service.createBusinessHour({
      tenantId: "tenant-1",
      dayOfWeek: 1,
      startTime: "17:00",
      endTime: "09:00"
    })).rejects.toThrow();

    expect(repository.createBusinessHour).not.toHaveBeenCalled();
  });
});
