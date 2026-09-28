import { ZodError } from "zod";
import {
  AppointmentConflictError,
  AppointmentUnavailableError
} from "../appointments/appointment.service.js";
import { PublicSiteNotFoundError } from "./public.service.js";
import { PublicController } from "./public.controller.js";

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };

  res.status.mockReturnValue(res);
  return res;
}

describe("PublicController appointment creation", () => {
  function createServiceMock() {
    return {
      createAppointment: jest.fn()
    };
  }

  it("returns the created appointment with HTTP 201", async () => {
    const service = createServiceMock();
    service.createAppointment.mockResolvedValue({
      id: "appointment-1",
      serviceId: "service-1",
      professionalId: "professional-1",
      startAt: new Date("2026-10-01T12:00:00.000Z"),
      endAt: new Date("2026-10-01T12:30:00.000Z"),
      status: "CONFIRMED"
    });

    const controller = new PublicController(service as never);
    const res = createResponseMock();

    await controller.createAppointment(
      {
        params: { publicKey: "pk_live_test" },
        body: {
          customerName: "Luis",
          customerPhone: "1122334455",
          serviceId: "service-1",
          startAt: "2026-10-01T12:00:00.000Z"
        }
      } as never,
      res as never
    );

    expect(service.createAppointment).toHaveBeenCalledWith(
      "pk_live_test",
      {
        customerName: "Luis",
        customerPhone: "1122334455",
        serviceId: "service-1",
        startAt: "2026-10-01T12:00:00.000Z"
      }
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: "appointment-1",
      serviceId: "service-1",
      professionalId: "professional-1",
      startAt: "2026-10-01T12:00:00.000Z",
      endAt: "2026-10-01T12:30:00.000Z",
      status: "CONFIRMED"
    });
  });

  it("returns 404 when the public site is unavailable", async () => {
    const service = createServiceMock();
    service.createAppointment.mockRejectedValue(
      new PublicSiteNotFoundError("El sitio no está disponible para reservas.")
    );

    const controller = new PublicController(service as never);
    const res = createResponseMock();

    await controller.createAppointment(
      {
        params: { publicKey: "pk_live_invalid" },
        body: {}
      } as never,
      res as never
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "PUBLIC_SITE_NOT_FOUND",
        message: "El sitio no está disponible para reservas."
      }
    });
  });

  it("returns 400 for invalid appointment data", async () => {
    const service = createServiceMock();
    service.createAppointment.mockRejectedValue(new ZodError([]));

    const controller = new PublicController(service as never);
    const res = createResponseMock();

    await controller.createAppointment(
      {
        params: { publicKey: "pk_live_test" },
        body: {}
      } as never,
      res as never
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_REQUEST",
        message: "Los datos del turno no son válidos."
      }
    });
  });

  it("returns 409 for appointment conflicts", async () => {
    const service = createServiceMock();
    service.createAppointment.mockRejectedValue(
      new AppointmentConflictError("El horario seleccionado ya no está disponible.")
    );

    const controller = new PublicController(service as never);
    const res = createResponseMock();

    await controller.createAppointment(
      {
        params: { publicKey: "pk_live_test" },
        body: {}
      } as never,
      res as never
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "APPOINTMENT_CONFLICT",
        message: "El horario seleccionado ya no está disponible."
      }
    });
  });

  it("returns 409 for unavailable appointment requests", async () => {
    const service = createServiceMock();
    service.createAppointment.mockRejectedValue(
      new AppointmentUnavailableError("El horario está fuera de servicio.")
    );

    const controller = new PublicController(service as never);
    const res = createResponseMock();

    await controller.createAppointment(
      {
        params: { publicKey: "pk_live_test" },
        body: {}
      } as never,
      res as never
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "APPOINTMENT_UNAVAILABLE",
        message: "El horario está fuera de servicio."
      }
    });
  });

  it("returns 400 when the public key is missing", async () => {
    const service = createServiceMock();
    const controller = new PublicController(service as never);
    const res = createResponseMock();

    await controller.createAppointment(
      {
        params: {},
        body: {}
      } as never,
      res as never
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_PUBLIC_KEY",
        message: "La clave pública no es válida."
      }
    });
    expect(service.createAppointment).not.toHaveBeenCalled();
  });
});
