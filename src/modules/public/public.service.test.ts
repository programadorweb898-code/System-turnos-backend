import { PublicRepository } from "./public.repository.js";
import { AvailabilityService } from "../availability/availability.service.js";
import { AppointmentService } from "../appointments/appointment.service.js";
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

  function createAppointmentServiceMock() {
    return {
      create: jest.fn()
    };
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
      repository as unknown as PublicRepository,
      availabilityService as unknown as AvailabilityService
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
      repository as unknown as PublicRepository,
      availabilityService as unknown as AvailabilityService
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
      repository as unknown as PublicRepository,
      availabilityService as unknown as AvailabilityService
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
      repository as unknown as PublicRepository,
      availabilityService as unknown as AvailabilityService
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


describe("PublicService appointment creation", () => {
  it("resolves the tenant from publicKey and delegates appointment creation", async () => {
    const repository = {
      findPublishedSiteByPublicKey: jest.fn().mockResolvedValue({
        tenant_id: "tenant-1"
      }),
      findActiveServicesByTenant: jest.fn()
    } as unknown as jest.Mocked<Pick<PublicRepository, "findPublishedSiteByPublicKey" | "findActiveServicesByTenant">>;
    const availabilityService = { getAvailability: jest.fn() };
    const appointmentService = { create: jest.fn().mockResolvedValue({
      id: "appointment-1",
      serviceId: "service-1",
      professionalId: "professional-1",
      startAt: new Date("2026-10-01T12:00:00.000Z"),
      endAt: new Date("2026-10-01T12:30:00.000Z"),
      status: "CONFIRMED"
    }) };

    const service = new PublicService(
      repository as unknown as PublicRepository,
      availabilityService as unknown as AvailabilityService,
      appointmentService as unknown as AppointmentService
    );

    await service.createAppointment("pk_live_test", {
      customerName: "Luis",
      customerPhone: "1122334455",
      serviceId: "11111111-1111-4111-8111-111111111111",
      startAt: "2026-10-01T12:00:00.000Z",
      professionalId: "22222222-2222-4222-8222-222222222222"
    });

    expect(appointmentService.create).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      customerName: "Luis",
      customerPhone: "1122334455",
      serviceId: "11111111-1111-4111-8111-111111111111",
      startAt: new Date("2026-10-01T12:00:00.000Z"),
      professionalId: "22222222-2222-4222-8222-222222222222"
    });
  });

  it("does not allow tenantId from the public request to override the resolved tenant", async () => {
    const repository = {
      findPublishedSiteByPublicKey: jest.fn().mockResolvedValue({
        tenant_id: "tenant-from-public-key"
      }),
      findActiveServicesByTenant: jest.fn()
    } as unknown as jest.Mocked<Pick<PublicRepository, "findPublishedSiteByPublicKey" | "findActiveServicesByTenant">>;
    const appointmentService = { create: jest.fn().mockResolvedValue({}) };

    const service = new PublicService(
      repository as unknown as PublicRepository,
      { getAvailability: jest.fn() } as unknown as AvailabilityService,
      appointmentService as unknown as AppointmentService
    );

    await service.createAppointment("pk_live_test", {
      customerName: "Luis",
      customerPhone: "1122334455",
      serviceId: "11111111-1111-4111-8111-111111111111",
      startAt: "2026-10-01T12:00:00.000Z",
      tenantId: "attacker-selected-tenant"
    });

    expect(appointmentService.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "tenant-from-public-key"
    }));
    expect(appointmentService.create.mock.calls[0][0]).not.toHaveProperty(
      "tenantId",
      "attacker-selected-tenant"
    );
  });
});
