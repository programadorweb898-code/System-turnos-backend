import { Service } from "../../database/entities/service.entity.js";
import { ConfigurationRepository } from "./configuration.repository.js";
import {
  ConfigurationService,
  ProfessionalNotFoundError,
  ProfessionalServicesNotAssignableError
} from "./configuration.service.js";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_SERVICE_ID = "22222222-2222-4222-8222-222222222222";
const PROFESSIONAL_ID = "33333333-3333-4333-8333-333333333333";

function buildService(id: string): Service {
  return {
    id,
    name: "Corte",
    description: null,
    duration: 30,
    status: "active"
  } as Service;
}

function createRepositoryMock(employeeExists = true) {
  return {
    findEmployeeByTenant: jest
      .fn()
      .mockResolvedValue(employeeExists ? { id: PROFESSIONAL_ID } : null),
    findServicesAssignedToEmployee: jest.fn().mockResolvedValue([]),
    countAssignableServicesByTenant: jest.fn().mockResolvedValue(0),
    replaceEmployeeServiceAssignments: jest.fn().mockResolvedValue(undefined)
  };
}

describe("ConfigurationService asignaciones de servicios", () => {
  it("rechaza listar cuando el profesional no pertenece al tenant", async () => {
    const repository = createRepositoryMock(false);
    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.listProfessionalServices("tenant-1", PROFESSIONAL_ID)
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);
  });

  it("rechaza reemplazar cuando el profesional no pertenece al tenant", async () => {
    const repository = createRepositoryMock(false);
    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.replaceProfessionalServices({
        tenantId: "tenant-1",
        professionalId: PROFESSIONAL_ID,
        serviceIds: [SERVICE_ID]
      })
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);

    expect(repository.replaceEmployeeServiceAssignments).not.toHaveBeenCalled();
  });

  it("rechaza asignar un servicio que no pertenece al tenant", async () => {
    const repository = createRepositoryMock();
    repository.countAssignableServicesByTenant.mockResolvedValue(1);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.replaceProfessionalServices({
        tenantId: "tenant-1",
        professionalId: PROFESSIONAL_ID,
        serviceIds: [SERVICE_ID, OTHER_SERVICE_ID]
      })
    ).rejects.toBeInstanceOf(ProfessionalServicesNotAssignableError);

    expect(repository.replaceEmployeeServiceAssignments).not.toHaveBeenCalled();
  });

  it("elimina duplicados antes de reemplazar", async () => {
    const repository = createRepositoryMock();
    repository.countAssignableServicesByTenant.mockResolvedValue(1);
    repository.findServicesAssignedToEmployee.mockResolvedValue([buildService(SERVICE_ID)]);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    const result = await service.replaceProfessionalServices({
      tenantId: "tenant-1",
      professionalId: PROFESSIONAL_ID,
      serviceIds: [SERVICE_ID, SERVICE_ID]
    });

    expect(repository.countAssignableServicesByTenant).toHaveBeenCalledWith("tenant-1", [
      SERVICE_ID
    ]);
    expect(repository.replaceEmployeeServiceAssignments).toHaveBeenCalledWith(
      "tenant-1",
      PROFESSIONAL_ID,
      [SERVICE_ID]
    );
    expect(result.map((assigned) => assigned.id)).toEqual([SERVICE_ID]);
  });

  it("reemplaza el conjunto de servicios y devuelve el resultado persistido", async () => {
    const repository = createRepositoryMock();
    repository.countAssignableServicesByTenant.mockResolvedValue(2);
    repository.findServicesAssignedToEmployee.mockResolvedValue([
      buildService(SERVICE_ID),
      buildService(OTHER_SERVICE_ID)
    ]);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    const result = await service.replaceProfessionalServices({
      tenantId: "tenant-1",
      professionalId: PROFESSIONAL_ID,
      serviceIds: [SERVICE_ID, OTHER_SERVICE_ID]
    });

    expect(repository.replaceEmployeeServiceAssignments).toHaveBeenCalledWith(
      "tenant-1",
      PROFESSIONAL_ID,
      [SERVICE_ID, OTHER_SERVICE_ID]
    );
    expect(result).toHaveLength(2);
  });

  it("permite dejar al profesional sin servicios asignados", async () => {
    const repository = createRepositoryMock();
    repository.findServicesAssignedToEmployee.mockResolvedValue([]);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    const result = await service.replaceProfessionalServices({
      tenantId: "tenant-1",
      professionalId: PROFESSIONAL_ID,
      serviceIds: []
    });

    expect(repository.countAssignableServicesByTenant).toHaveBeenCalledWith("tenant-1", []);
    expect(repository.replaceEmployeeServiceAssignments).toHaveBeenCalledWith(
      "tenant-1",
      PROFESSIONAL_ID,
      []
    );
    expect(result).toEqual([]);
  });
});
