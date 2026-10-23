import { Request, Response } from "express";
import { Appointment } from "../../database/entities/appointment.entity.js";
import {
  ManagedAppointmentNotFoundError,
  ManagedAppointmentStateError,
  ManagedAppointmentUnavailableError
} from "./appointment.management.repository.js";
import { AppointmentManagementService } from "./appointment.management.service.js";
import {
  appointmentIdSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  rescheduleAppointmentSchema
} from "./appointment.management.validation.js";

const toResponse = (appointment: Appointment) => ({
  id: appointment.id,
  serviceId: appointment.serviceId,
  professionalId: appointment.professionalId,
  customerName: appointment.customerName,
  customerPhone: appointment.customerPhone,
  customerNotes: appointment.customerNotes,
  startAt: appointment.startAt.toISOString(),
  endAt: appointment.endAt.toISOString(),
  status: appointment.status
});

function respondError(res: Response, error: unknown): boolean {
  if (error instanceof ManagedAppointmentNotFoundError) {
    res.status(404).json({
      error: { code: "APPOINTMENT_NOT_FOUND", message: "El turno no existe." }
    });
    return true;
  }
  if (error instanceof ManagedAppointmentStateError) {
    res.status(409).json({
      error: { code: "APPOINTMENT_NOT_MODIFIABLE", message: error.message }
    });
    return true;
  }
  if (error instanceof ManagedAppointmentUnavailableError) {
    res.status(409).json({
      error: { code: "APPOINTMENT_CONFLICT", message: error.message }
    });
    return true;
  }
  return false;
}

export class AppointmentManagementController {
  constructor(private readonly service = new AppointmentManagementService()) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.authenticatedUser?.tenantId;
    if (!tenantId) {
      res.status(401).json({
        error: { code: "AUTHENTICATION_REQUIRED", message: "Se requiere autenticación." }
      });
      return;
    }

    const parsed = listAppointmentsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "El intervalo de consulta no es válido." }
      });
      return;
    }

    const { from, to, status, limit, offset } = parsed.data;
    const result = await this.service.list(tenantId, {
      from: new Date(from), to: new Date(to), status, limit, offset
    });
    res.status(200).json({
      items: result.items.map(toResponse),
      total: result.total,
      limit,
      offset
    });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const user = req.authenticatedUser;
    if (!user) {
      res.status(401).json({
        error: { code: "AUTHENTICATION_REQUIRED", message: "Se requiere autenticación." }
      });
      return;
    }

    const id = appointmentIdSchema.safeParse(req.params.id);
    const body = cancelAppointmentSchema.safeParse(req.body ?? {});
    if (!id.success || !body.success) {
      res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "Los datos de cancelación no son válidos." }
      });
      return;
    }

    try {
      const appointment = await this.service.cancel(
        user.tenantId, id.data, user.id, body.data.reason || null
      );
      res.status(200).json(toResponse(appointment));
    } catch (error) {
      if (!respondError(res, error)) throw error;
    }
  };

  reschedule = async (req: Request, res: Response): Promise<void> => {
    const user = req.authenticatedUser;
    if (!user) {
      res.status(401).json({
        error: { code: "AUTHENTICATION_REQUIRED", message: "Se requiere autenticación." }
      });
      return;
    }

    const id = appointmentIdSchema.safeParse(req.params.id);
    const body = rescheduleAppointmentSchema.safeParse(req.body ?? {});
    if (!id.success || !body.success) {
      res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "Los datos de reprogramación no son válidos." }
      });
      return;
    }

    try {
      const appointment = await this.service.reschedule(
        user.tenantId, id.data, user.id, new Date(body.data.startAt), body.data.professionalId
      );
      res.status(200).json(toResponse(appointment));
    } catch (error) {
      if (!respondError(res, error)) throw error;
    }
  };
}
