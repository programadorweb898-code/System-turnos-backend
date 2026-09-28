import { Employee } from "../../database/entities/employee.entity.js";
import { Appointment } from "../../database/entities/appointment.entity.js";
import { AppointmentRepository } from "./appointment.repository.js";
import {
  AppointmentConflictError,
  AppointmentService,
  AppointmentUnavailableError
} from "./appointment.service.js";

function createRepositoryMock() {
  return {
    getCreationContext: jest.fn(),
    professionalHasConflict: jest.fn(),
    create: jest.fn()
  } as unknown as jest.Mocked<Pick<
    AppointmentRepository,
    "getCreationContext" | "professionalHasConflict" | "create"
  >>;
}

function createContext() {
  const professional = new Employee();
  professional.id = "00000000-0000-4000-8000-000000000003";
  professional.tenantId = "00000000-0000-4000-8000-000000000001";
  professional.name = "Juan";
  professional.status = "active";

  return {
    tenant: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Peluquería",
      slug: "peluqueria",
      timezone: "UTC",
      maxDailyAppointments: 20,
      minimumBookingNoticeHours: 0,
      status: "published"
    },
    service: {
      id: "00000000-0000-4000-8000-000000000002",
      tenantId: "00000000-0000-4000-8000-000000000001",
      name: "Corte",
      description: null,
      duration: 30,
      status: "active"
    },
    professionals: [professional],
    businessHours: [
      {
        dayOfWeek: 4,
        startTime: "09:00:00",
        endTime: "17:00:00"
      }
    ],
    blocked: false,
    dailyAppointments: 0
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: "00000000-0000-4000-8000-000000000001",
    customerName: "Luis",
    customerPhone: "1122334455",
    serviceId: "00000000-0000-4000-8000-000000000002",
    startAt: new Date("2099-10-01T12:00:00.000Z"),
    professionalId: "00000000-0000-4000-8000-000000000003",
    ...overrides
  };
}

describe("AppointmentService.create", () => {
  it("creates an appointment when the requested slot is valid", async () => {
    const repository = createRepositoryMock();
    repository.getCreationContext.mockResolvedValue(createContext() as never);
    repository.professionalHasConflict.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000004",
      serviceId: "00000000-0000-4000-8000-000000000002",
      professionalId: "00000000-0000-4000-8000-000000000003",
      startAt: new Date("2099-10-01T12:00:00.000Z"),
      endAt: new Date("2099-10-01T12:30:00.000Z"),
      status: "CONFIRMED"
    } as Appointment);

    const service = new AppointmentService(repository as never);

    const result = await service.create(createInput());

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "00000000-0000-4000-8000-000000000001",
        professionalId: "00000000-0000-4000-8000-000000000003",
        startAt: new Date("2099-10-01T12:00:00.000Z"),
        endAt: new Date("2099-10-01T12:30:00.000Z")
      })
    );
    expect(result.id).toBe("00000000-0000-4000-8000-000000000004");
  });

  it("rejects a slot outside business hours", async () => {
    const repository = createRepositoryMock();
    repository.getCreationContext.mockResolvedValue(createContext() as never);

    const service = new AppointmentService(repository as never);

    await expect(
      service.create(
        createInput({
          startAt: new Date("2099-10-01T17:00:00.000Z")
        })
      )
    ).rejects.toBeInstanceOf(AppointmentUnavailableError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a blocked slot", async () => {
    const repository = createRepositoryMock();
    repository.getCreationContext.mockResolvedValue({
      ...createContext(),
      blocked: true
    } as never);

    const service = new AppointmentService(repository as never);

    await expect(service.create(createInput())).rejects.toBeInstanceOf(
      AppointmentConflictError
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a slot when the selected professional has a conflict", async () => {
    const repository = createRepositoryMock();
    repository.getCreationContext.mockResolvedValue(createContext() as never);
    repository.professionalHasConflict.mockResolvedValue(true);

    const service = new AppointmentService(repository as never);

    await expect(service.create(createInput())).rejects.toBeInstanceOf(
      AppointmentConflictError
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("maps the PostgreSQL exclusion constraint to an appointment conflict", async () => {
    const repository = createRepositoryMock();
    repository.getCreationContext.mockResolvedValue(createContext() as never);
    repository.professionalHasConflict.mockResolvedValue(false);
    repository.create.mockRejectedValue({
      constraint: "EXCL_appointments_professional_time"
    });

    const service = new AppointmentService(repository as never);

    await expect(service.create(createInput())).rejects.toBeInstanceOf(
      AppointmentConflictError
    );
  });

  it("rejects a booking that does not satisfy the minimum notice", async () => {
    const repository = createRepositoryMock();
    repository.getCreationContext.mockResolvedValue({
      ...createContext(),
      tenant: {
        ...createContext().tenant,
        minimumBookingNoticeHours: 24
      }
    } as never);

    const service = new AppointmentService(repository as never);

    await expect(
      service.create({
        ...createInput(),
        startAt: new Date(Date.now() + 60 * 60 * 1000)
      })
    ).rejects.toBeInstanceOf(AppointmentUnavailableError);

    expect(repository.create).not.toHaveBeenCalled();
  });
});
