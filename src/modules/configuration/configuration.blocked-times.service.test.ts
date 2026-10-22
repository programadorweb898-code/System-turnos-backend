import { ConfigurationRepository } from "./configuration.repository.js";
import {
  BlockedTimeConflictsError,
  ConfigurationService,
  ProfessionalNotFoundError
} from "./configuration.service.js";

const PROFESSIONAL_ID = "33333333-3333-4333-8333-333333333333";
const STARTS_AT = new Date("2026-03-10T14:00:00.000Z");
const ENDS_AT = new Date("2026-03-10T16:00:00.000Z");

function createRepositoryMock() {
  return {
    createBlockedTime: jest.fn().mockResolvedValue({ id: "blocked-1" }),
    findAppointmentsOverlappingBlockedTime: jest.fn().mockResolvedValue([]),
    findBlockedTimesByTenant: jest.fn().mockResolvedValue([]),
    findEmployeeByTenant: jest.fn().mockResolvedValue({ id: PROFESSIONAL_ID })
  };
}

describe("ConfigurationService createBlockedTime", () => {
  it("crea el bloqueo sin profesional cuando no se informa", async () => {
    const repository = createRepositoryMock();
    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await service.createBlockedTime({
      tenantId: "tenant-1",
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      reason: "  Capacitación  "
    });

    expect(repository.findAppointmentsOverlappingBlockedTime).toHaveBeenCalledWith(
      "tenant-1",
      null,
      STARTS_AT,
      ENDS_AT
    );
    expect(repository.createBlockedTime).toHaveBeenCalledWith(
      "tenant-1",
      STARTS_AT,
      ENDS_AT,
      "Capacitación",
      null
    );
  });

  it("persiste el motivo ausente como null", async () => {
    const repository = createRepositoryMock();
    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await service.createBlockedTime({
      tenantId: "tenant-1",
      startsAt: STARTS_AT,
      endsAt: ENDS_AT
    });

    expect(repository.createBlockedTime).toHaveBeenCalledWith(
      "tenant-1",
      STARTS_AT,
      ENDS_AT,
      null,
      null
    );
  });

  it("rechaza crear el bloqueo si un turno confirmado se superpone", async () => {
    const repository = createRepositoryMock();
    repository.findAppointmentsOverlappingBlockedTime.mockResolvedValue([
      {
        id: "appointment-1",
        customerName: "Ana Gómez",
        startAt: new Date("2026-03-10T14:30:00.000Z"),
        endAt: new Date("2026-03-10T15:00:00.000Z")
      }
    ]);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.createBlockedTime({
        tenantId: "tenant-1",
        startsAt: STARTS_AT,
        endsAt: ENDS_AT
      })
    ).rejects.toBeInstanceOf(BlockedTimeConflictsError);

    expect(repository.createBlockedTime).not.toHaveBeenCalled();
  });

  it("devuelve un detalle por cada turno en conflicto", async () => {
    const repository = createRepositoryMock();
    repository.findAppointmentsOverlappingBlockedTime.mockResolvedValue([
      {
        id: "appointment-1",
        customerName: "Ana Gómez",
        startAt: new Date("2026-03-10T14:30:00.000Z"),
        endAt: new Date("2026-03-10T15:00:00.000Z")
      },
      {
        id: "appointment-2",
        customerName: "Luis Pérez",
        startAt: new Date("2026-03-10T15:00:00.000Z"),
        endAt: new Date("2026-03-10T15:30:00.000Z")
      }
    ]);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.createBlockedTime({
        tenantId: "tenant-1",
        startsAt: STARTS_AT,
        endsAt: ENDS_AT
      })
    ).rejects.toMatchObject({
      details: [
        "Turno del 2026-03-10T14:30:00.000Z al 2026-03-10T15:00:00.000Z (Ana Gómez).",
        "Turno del 2026-03-10T15:00:00.000Z al 2026-03-10T15:30:00.000Z (Luis Pérez)."
      ]
    });
  });

  it("no modifica ningún turno cuando hay conflicto", async () => {
    const repository = createRepositoryMock();
    repository.findAppointmentsOverlappingBlockedTime.mockResolvedValue([
      {
        id: "appointment-1",
        customerName: "Ana Gómez",
        startAt: new Date("2026-03-10T14:30:00.000Z"),
        endAt: new Date("2026-03-10T15:00:00.000Z")
      }
    ]);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.createBlockedTime({
        tenantId: "tenant-1",
        startsAt: STARTS_AT,
        endsAt: ENDS_AT
      })
    ).rejects.toBeInstanceOf(BlockedTimeConflictsError);

    const mutationCalls = Object.keys(repository).filter(
      (key) =>
        typeof (repository as unknown as Record<string, unknown>)[key] === "function" &&
        /update|save|delete|cancel|reschedule|remove/i.test(key)
    );

    expect(mutationCalls).toEqual([]);
  });

  it("acepta un bloqueo dirigido a un profesional del tenant", async () => {
    const repository = createRepositoryMock();
    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await service.createBlockedTime({
      tenantId: "tenant-1",
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      professionalId: PROFESSIONAL_ID
    });

    expect(repository.findAppointmentsOverlappingBlockedTime).toHaveBeenCalledWith(
      "tenant-1",
      PROFESSIONAL_ID,
      STARTS_AT,
      ENDS_AT
    );
    expect(repository.createBlockedTime).toHaveBeenCalledWith(
      "tenant-1",
      STARTS_AT,
      ENDS_AT,
      null,
      PROFESSIONAL_ID
    );
  });

  it("rechaza un profesional ajeno al tenant", async () => {
    const repository = createRepositoryMock();
    repository.findEmployeeByTenant.mockResolvedValue(null);

    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.createBlockedTime({
        tenantId: "tenant-1",
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        professionalId: PROFESSIONAL_ID
      })
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);

    expect(repository.createBlockedTime).not.toHaveBeenCalled();
    expect(repository.findAppointmentsOverlappingBlockedTime).not.toHaveBeenCalled();
  });

  it("rechaza un intervalo invertido antes de tocar la base de datos", async () => {
    const repository = createRepositoryMock();
    const service = new ConfigurationService(repository as unknown as ConfigurationRepository);

    await expect(
      service.createBlockedTime({
        tenantId: "tenant-1",
        startsAt: ENDS_AT,
        endsAt: STARTS_AT
      })
    ).rejects.toThrow();

    expect(repository.findAppointmentsOverlappingBlockedTime).not.toHaveBeenCalled();
  });
});
