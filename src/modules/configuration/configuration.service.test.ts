import { ConfigurationService } from "./configuration.service.js";

describe("ConfigurationService - professionals", () => {
  it("crea un profesional con el tenant recibido", async () => {
    const repository = {
      createEmployee: jest.fn().mockResolvedValue({
        id: "employee-1",
        tenantId: "tenant-1",
        name: "Juan",
        status: "active"
      })
    };

    const service = new ConfigurationService(repository);

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

    const service = new ConfigurationService(repository);

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

    const service = new ConfigurationService(repository);

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
