import { Tenant } from "../../database/entities/tenant.entity.js";
import { TenantRepository } from "./tenant.repository.js";
import {
  TenantNotFoundError,
  TenantNotReadyError,
  TenantService
} from "./tenant.service.js";
import { TenantPublicationRequirements } from "./tenant.types.js";

const COMPLETE_REQUIREMENTS: TenantPublicationRequirements = {
  hasName: true,
  hasValidSlug: true,
  hasValidTimezone: true,
  hasActiveService: true,
  hasActiveProfessional: true,
  hasEligibleAssignment: true,
  hasBusinessHours: true
};

function buildTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: "tenant-1",
    name: "Peluquería Luis",
    slug: "peluqueria-luis",
    timezone: "America/Argentina/Buenos_Aires",
    maxDailyAppointments: 20,
    minimumBookingNoticeHours: 0,
    status: "draft",
    ...overrides
  } as Tenant;
}

function createRepositoryMock() {
  return {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    findPublicationRequirements: jest.fn()
  } as unknown as jest.Mocked<TenantRepository>;
}

describe("TenantService publicación", () => {
  it("publica un tenant que cumple los requisitos mínimos", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant());
    repository.findPublicationRequirements.mockResolvedValue(COMPLETE_REQUIREMENTS);
    repository.findById.mockResolvedValueOnce(buildTenant()).mockResolvedValueOnce(
      buildTenant({ status: "published" })
    );

    const service = new TenantService(repository as unknown as TenantRepository);

    const result = await service.publish("tenant-1");

    expect(repository.updateStatus).toHaveBeenCalledWith("tenant-1", "published");
    expect(result.status).toBe("published");
  });

  it("rechaza publicar sin servicios activos", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant());
    repository.findPublicationRequirements.mockResolvedValue({
      ...COMPLETE_REQUIREMENTS,
      hasActiveService: false
    });

    const service = new TenantService(repository as unknown as TenantRepository);

    await expect(service.publish("tenant-1")).rejects.toBeInstanceOf(TenantNotReadyError);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("rechaza publicar sin asignación elegible de profesional a servicio", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant());
    repository.findPublicationRequirements.mockResolvedValue({
      ...COMPLETE_REQUIREMENTS,
      hasEligibleAssignment: false
    });

    const service = new TenantService(repository as unknown as TenantRepository);

    await expect(service.publish("tenant-1")).rejects.toMatchObject({
      details: [
        "Debe existir al menos un profesional activo asignado a un servicio activo."
      ]
    });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("rechaza publicar sin horarios de atención", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant());
    repository.findPublicationRequirements.mockResolvedValue({
      ...COMPLETE_REQUIREMENTS,
      hasBusinessHours: false
    });

    const service = new TenantService(repository as unknown as TenantRepository);

    await expect(service.publish("tenant-1")).rejects.toMatchObject({
      details: ["Debe configurarse el horario de atención."]
    });
  });

  it("acumula todos los requisitos incumplidos", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant());
    repository.findPublicationRequirements.mockResolvedValue({
      hasName: true,
      hasValidSlug: false,
      hasValidTimezone: true,
      hasActiveService: false,
      hasActiveProfessional: false,
      hasEligibleAssignment: false,
      hasBusinessHours: false
    });

    const service = new TenantService(repository as unknown as TenantRepository);

    await expect(service.publish("tenant-1")).rejects.toMatchObject({
      details: [
        "Debe configurar un slug público válido.",
        "Debe existir al menos un servicio activo con duración positiva.",
        "Debe existir al menos un profesional activo.",
        "Debe existir al menos un profesional activo asignado a un servicio activo.",
        "Debe configurarse el horario de atención."
      ]
    });
  });

  it("revalida y es idempotente al publicar un tenant ya publicado", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant({ status: "published" }));
    repository.findPublicationRequirements.mockResolvedValue(COMPLETE_REQUIREMENTS);

    const service = new TenantService(repository as unknown as TenantRepository);

    const result = await service.publish("tenant-1");

    expect(repository.findPublicationRequirements).toHaveBeenCalledTimes(1);
    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(result.status).toBe("published");
  });

  it("rechaza publicar un tenant ya publicado cuya configuración se volvió inválida", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant({ status: "published" }));
    repository.findPublicationRequirements.mockResolvedValue({
      ...COMPLETE_REQUIREMENTS,
      hasEligibleAssignment: false
    });

    const service = new TenantService(repository as unknown as TenantRepository);

    await expect(service.publish("tenant-1")).rejects.toBeInstanceOf(TenantNotReadyError);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("rechaza publicar un tenant inexistente", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(null);

    const service = new TenantService(repository as unknown as TenantRepository);

    await expect(service.publish("tenant-inexistente")).rejects.toBeInstanceOf(
      TenantNotFoundError
    );
  });

  it("despublica un negocio y conserva el historial", async () => {
    const repository = createRepositoryMock();
    repository.findById
      .mockResolvedValueOnce(buildTenant({ status: "published" }))
      .mockResolvedValueOnce(buildTenant({ status: "unpublished" }));

    const service = new TenantService(repository as unknown as TenantRepository);

    const result = await service.unpublish("tenant-1");

    expect(repository.updateStatus).toHaveBeenCalledWith("tenant-1", "unpublished");
    expect(result.status).toBe("unpublished");
  });

  it("es idempotente al despublicar un negocio ya despublicado", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(buildTenant({ status: "unpublished" }));

    const service = new TenantService(repository as unknown as TenantRepository);

    const result = await service.unpublish("tenant-1");

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(result.status).toBe("unpublished");
  });

  it("despublica sin validar requisitos de publicación", async () => {
    const repository = createRepositoryMock();
    repository.findById
      .mockResolvedValueOnce(buildTenant({ status: "draft" }))
      .mockResolvedValueOnce(buildTenant({ status: "unpublished" }));

    const service = new TenantService(repository as unknown as TenantRepository);

    await service.unpublish("tenant-1");

    expect(repository.findPublicationRequirements).not.toHaveBeenCalled();
  });
});
