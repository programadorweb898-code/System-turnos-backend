import { ConfigurationController } from "./configuration.controller.js";
import {
  BlockedTimeConflictsError,
  ConfigurationService,
  ProfessionalNotFoundError
} from "./configuration.service.js";

const STARTS_AT = "2026-03-10T14:00:00.000Z";
const ENDS_AT = "2026-03-10T16:00:00.000Z";

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

function createRequest(body: unknown, options: { authenticated?: boolean } = {}) {
  const authenticated = options.authenticated !== false;

  return {
    body,
    authenticatedUser: authenticated
      ? { id: "user-1", tenantId: "tenant-1", role: "ADMIN" }
      : undefined
  };
}

const validBody = {
  startsAt: STARTS_AT,
  endsAt: ENDS_AT,
  reason: "Capacitación"
};

function createServiceMock(blockedTime: Record<string, unknown> = {}) {
  return {
    createBlockedTime: jest.fn().mockResolvedValue({
      id: "blocked-1",
      professionalId: null,
      startsAt: new Date(STARTS_AT),
      endsAt: new Date(ENDS_AT),
      reason: "Capacitación",
      ...blockedTime
    }),
    listBlockedTimes: jest.fn().mockResolvedValue([
      {
        id: "blocked-1",
        professionalId: null,
        startsAt: new Date(STARTS_AT),
        endsAt: new Date(ENDS_AT),
        reason: "Capacitación"
      }
    ])
  };
}

describe("ConfigurationController bloqueos de agenda", () => {
  it("crea el bloqueo y responde 201", async () => {
    const service = createServiceMock();
    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.createBlockedTime(
      createRequest(validBody) as never,
      response as never
    );

    expect(service.createBlockedTime).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      startsAt: new Date(STARTS_AT),
      endsAt: new Date(ENDS_AT),
      reason: "Capacitación",
      professionalId: null
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      id: "blocked-1",
      professionalId: null,
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      reason: "Capacitación"
    });
  });

  it("ignora un tenantId enviado por el cliente", async () => {
    const service = createServiceMock();
    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.createBlockedTime(
      createRequest({ ...validBody, tenantId: "tenant-ajeno" }) as never,
      response as never
    );

    expect(service.createBlockedTime).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" })
    );
  });

  it("responde 409 con el envelope y details ante conflicto con un turno", async () => {
    const service = createServiceMock();
    service.createBlockedTime.mockRejectedValue(
      new BlockedTimeConflictsError([
        "Turno del 2026-03-10T14:30:00.000Z al 2026-03-10T15:00:00.000Z (Ana Gómez)."
      ])
    );

    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.createBlockedTime(
      createRequest(validBody) as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "BLOCKED_TIME_CONFLICTS",
        message: "No se puede crear el bloqueo porque hay turnos confirmados en ese intervalo.",
        details: [
          "Turno del 2026-03-10T14:30:00.000Z al 2026-03-10T15:00:00.000Z (Ana Gómez)."
        ]
      }
    });
  });

  it("responde 404 cuando el profesional no pertenece al tenant", async () => {
    const service = createServiceMock();
    service.createBlockedTime.mockRejectedValue(new ProfessionalNotFoundError());

    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.createBlockedTime(
      createRequest({ ...validBody, professionalId: "33333333-3333-4333-8333-333333333333" }) as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "PROFESSIONAL_NOT_FOUND",
        message: "El profesional no existe."
      }
    });
  });

  it("responde 400 con un intervalo invertido", async () => {
    const service = createServiceMock();
    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.createBlockedTime(
      createRequest({ startsAt: ENDS_AT, endsAt: STARTS_AT }) as never,
      response as never
    );

    expect(service.createBlockedTime).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_REQUEST",
        message: "Los datos del bloqueo no son válidos."
      }
    });
  });

  it("responde 400 con una fecha mal formada", async () => {
    const service = createServiceMock();
    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.createBlockedTime(
      createRequest({ startsAt: "ayer", endsAt: ENDS_AT }) as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("rechaza crear sin autenticación", async () => {
    const service = createServiceMock();
    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.createBlockedTime(
      createRequest(validBody, { authenticated: false }) as never,
      response as never
    );

    expect(service.createBlockedTime).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("lista los bloqueos del tenant autenticado", async () => {
    const service = createServiceMock();
    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.listBlockedTimes(createRequest({}) as never, response as never);

    expect(service.listBlockedTimes).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([
      {
        id: "blocked-1",
        professionalId: null,
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        reason: "Capacitación"
      }
    ]);
  });

  it("rechaza listar sin autenticación", async () => {
    const service = createServiceMock();
    const controller = new ConfigurationController(service as unknown as ConfigurationService);
    const response = createResponseMock();

    await controller.listBlockedTimes(createRequest({}, { authenticated: false }) as never, response as never);

    expect(service.listBlockedTimes).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });
});
