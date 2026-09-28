import { PublicRepository } from "./public.repository.js";
import {
  PublicService,
  PublicSiteNotFoundError
} from "./public.service.js";

describe("PublicService availability", () => {
  function createRepositoryMock() {
    return {
      findPublishedSiteByPublicKey: jest.fn(),
      findActiveServicesByTenant: jest.fn()
    } as unknown as jest.Mocked<Pick<
      PublicRepository,
      "findPublishedSiteByPublicKey" | "findActiveServicesByTenant"
    >>;
  }

  function createAvailabilityServiceMock() {
    return {
      getAvailability: jest.fn()
    };
  }

  it("resolves the tenant from publicKey and delegates to the availability engine", async () => {
    const repository = createRepositoryMock();
    const availabilityService = createAvailabilityServiceMock();

    repository.findPublishedSiteByPublicKey.mockResolvedValue({
      tenant_id: "tenant-1"
    } as never);

    availabilityService.getAvailability.mockResolvedValue([
      {
        startAt: new Date("2026-10-01T12:00:00.000Z"),
        endAt: new Date("2026-10-01T12:30:00.000Z"),
        professionals: [{ id: "professional-1", name: "Juan" }]
      }
    ]);

    const service = new PublicService(
      repository,
      availabilityService as never
    );

    const result = await service.getAvailability("pk_live_test", {
      serviceId: "11111111-1111-4111-8111-111111111111",
      date: "2026-10-01"
    });

    expect(repository.findPublishedSiteByPublicKey).toHaveBeenCalledWith(
      "pk_live_test"
    );
    expect(availabilityService.getAvailability).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      serviceId: "11111111-1111-4111-8111-111111111111",
      date: "2026-10-01"
    });
    expect(result).toHaveLength(1);
  });

  it("does not allow the caller to select another tenant", async () => {
    const repository = createRepositoryMock();
    const availabilityService = createAvailabilityServiceMock();

    repository.findPublishedSiteByPublicKey.mockResolvedValue({
      tenant_id: "tenant-from-public-key"
    } as never);
    availabilityService.getAvailability.mockResolvedValue([]);

    const service = new PublicService(
      repository,
      availabilityService as never
    );

    await service.getAvailability("pk_live_test", {
      serviceId: "22222222-2222-4222-8222-222222222222",
      date: "2026-10-01",
      tenantId: "attacker-selected-tenant"
    });

    expect(availabilityService.getAvailability).toHaveBeenCalledWith({
      tenantId: "tenant-from-public-key",
      serviceId: "22222222-2222-4222-8222-222222222222",
      date: "2026-10-01"
    });
  });

  it("rejects an unavailable public site", async () => {
    const repository = createRepositoryMock();
    const availabilityService = createAvailabilityServiceMock();

    repository.findPublishedSiteByPublicKey.mockResolvedValue(undefined);

    const service = new PublicService(
      repository,
      availabilityService as never
    );

    await expect(
      service.getAvailability("pk_live_invalid", {
        serviceId: "11111111-1111-4111-8111-111111111111",
        date: "2026-10-01"
      })
    ).rejects.toBeInstanceOf(PublicSiteNotFoundError);

    expect(availabilityService.getAvailability).not.toHaveBeenCalled();
  });

  it("validates availability parameters before calling the engine", async () => {
    const repository = createRepositoryMock();
    const availabilityService = createAvailabilityServiceMock();

    repository.findPublishedSiteByPublicKey.mockResolvedValue({
      tenant_id: "tenant-1"
    } as never);

    const service = new PublicService(
      repository,
      availabilityService as never
    );

    await expect(
      service.getAvailability("pk_live_test", {
        serviceId: "not-a-uuid",
        date: "2026-10-01"
      })
    ).rejects.toThrow();

    expect(availabilityService.getAvailability).not.toHaveBeenCalled();
  });
});
