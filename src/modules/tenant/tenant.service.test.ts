import { Tenant } from "../../database/entities/tenant.entity.js";
import { TenantRepository } from "./tenant.repository.js";
import { TenantService } from "./tenant.service.js";

describe("TenantService", () => {
  const validInput = {
    name: "Peluquería Luis",
    slug: "peluqueria-luis",
    timezone: "America/Argentina/Buenos_Aires",
    maxDailyAppointments: 10,
    minimumBookingNoticeHours: 2
  };

  function createRepositoryMock() {
    return {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    } as unknown as jest.Mocked<TenantRepository>;
  }

  it("crea un tenant con las reglas configuradas", async () => {
    const repository = createRepositoryMock();
    const createdTenant = {
      id: "tenant-1",
      ...validInput,
      status: "draft"
    } as Tenant;

    repository.findBySlug.mockResolvedValue(null);
    repository.create.mockResolvedValue(createdTenant);

    const service = new TenantService(repository);

    const result = await service.create(validInput);

    expect(repository.findBySlug).toHaveBeenCalledWith(validInput.slug);
    expect(repository.create).toHaveBeenCalledWith(
      validInput.name,
      validInput.slug,
      validInput.timezone,
      validInput.maxDailyAppointments,
      validInput.minimumBookingNoticeHours
    );
    expect(result).toBe(createdTenant);
  });

  it("rechaza crear un tenant con slug duplicado", async () => {
    const repository = createRepositoryMock();
    repository.findBySlug.mockResolvedValue({ id: "tenant-existente" } as Tenant);

    const service = new TenantService(repository);

    await expect(service.create(validInput)).rejects.toThrow(
      "Ya existe un negocio con ese slug."
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("actualiza las reglas configurables del tenant", async () => {
    const repository = createRepositoryMock();
    const tenant = {
      id: "tenant-1",
      name: "Peluquería Luis",
      slug: "peluqueria-luis",
      timezone: "America/Argentina/Buenos_Aires",
      maxDailyAppointments: 10,
      minimumBookingNoticeHours: 2,
      status: "draft"
    } as Tenant;

    repository.findById.mockResolvedValue(tenant);
    repository.update.mockImplementation(async (value) => value);

    const service = new TenantService(repository);

    const result = await service.update("tenant-1", {
      maxDailyAppointments: 15,
      minimumBookingNoticeHours: 4
    });

    expect(repository.findById).toHaveBeenCalledWith("tenant-1");
    expect(tenant.maxDailyAppointments).toBe(15);
    expect(tenant.minimumBookingNoticeHours).toBe(4);
    expect(repository.update).toHaveBeenCalledWith(tenant);
    expect(result).toBe(tenant);
  });

  it("permite actualizar el slug cuando no está ocupado", async () => {
    const repository = createRepositoryMock();
    const tenant = {
      id: "tenant-1",
      name: "Peluquería Luis",
      slug: "peluqueria-luis",
      timezone: "America/Argentina/Buenos_Aires",
      maxDailyAppointments: 10,
      minimumBookingNoticeHours: 2,
      status: "draft"
    } as Tenant;

    repository.findById.mockResolvedValue(tenant);
    repository.findBySlug.mockResolvedValue(null);
    repository.update.mockImplementation(async (value) => value);

    const service = new TenantService(repository);

    await service.update("tenant-1", { slug: "nuevo-slug" });

    expect(repository.findBySlug).toHaveBeenCalledWith("nuevo-slug");
    expect(tenant.slug).toBe("nuevo-slug");
  });

  it("rechaza actualizar a un slug ocupado", async () => {
    const repository = createRepositoryMock();
    const tenant = {
      id: "tenant-1",
      slug: "peluqueria-luis"
    } as Tenant;

    repository.findById.mockResolvedValue(tenant);
    repository.findBySlug.mockResolvedValue({ id: "tenant-2" } as Tenant);

    const service = new TenantService(repository);

    await expect(
      service.update("tenant-1", { slug: "otro-negocio" })
    ).rejects.toThrow("Ya existe un negocio con ese slug.");

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("rechaza actualizar un tenant inexistente", async () => {
    const repository = createRepositoryMock();
    repository.findById.mockResolvedValue(null);

    const service = new TenantService(repository);

    await expect(
      service.update("tenant-no-existe", { maxDailyAppointments: 10 })
    ).rejects.toThrow("El negocio no existe.");

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("no consulta slug si la actualización no cambia el slug", async () => {
    const repository = createRepositoryMock();
    const tenant = {
      id: "tenant-1",
      slug: "peluqueria-luis",
      maxDailyAppointments: 10,
      minimumBookingNoticeHours: 2
    } as Tenant;

    repository.findById.mockResolvedValue(tenant);
    repository.update.mockImplementation(async (value) => value);

    const service = new TenantService(repository);

    await service.update("tenant-1", {
      slug: "peluqueria-luis",
      maxDailyAppointments: 12
    });

    expect(repository.findBySlug).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(tenant);
  });
});
