import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  AvailabilityUnavailableError
} from "../availability/availability.service.js";
import {
  AppointmentConflictError,
  AppointmentUnavailableError
} from "../appointments/appointment.service.js";
import {
  PublicService,
  PublicSiteNotFoundError
} from "./public.service.js";

export class PublicController {
  constructor(private readonly service = new PublicService()) {}

  getSite = async (req: Request, res: Response): Promise<void> => {
    const publicKey = req.params.publicKey;

    if (typeof publicKey !== "string" || publicKey.length === 0) {
      res.status(400).json({
        error: {
          code: "INVALID_PUBLIC_KEY",
          message: "La clave pública no es válida."
        }
      });
      return;
    }

    try {
      const site = await this.service.getSite(publicKey);

      res.status(200).json({
        name: site.tenant_name,
        slug: site.tenant_slug,
        timezone: site.tenant_timezone
      });
    } catch (error) {
      if (error instanceof PublicSiteNotFoundError) {
        res.status(404).json({
          error: {
            code: "PUBLIC_SITE_NOT_FOUND",
            message: "El sitio no está disponible para reservas."
          }
        });
        return;
      }

      throw error;
    }
  };

  listServices = async (req: Request, res: Response): Promise<void> => {
    const publicKey = req.params.publicKey;

    if (typeof publicKey !== "string" || publicKey.length === 0) {
      res.status(400).json({
        error: {
          code: "INVALID_PUBLIC_KEY",
          message: "La clave pública no es válida."
        }
      });
      return;
    }

    try {
      const services = await this.service.listServices(publicKey);

      res.status(200).json(
        services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          duration: service.duration
        }))
      );
    } catch (error) {
      if (error instanceof PublicSiteNotFoundError) {
        res.status(404).json({
          error: {
            code: "PUBLIC_SITE_NOT_FOUND",
            message: "El sitio no está disponible para reservas."
          }
        });
        return;
      }

      throw error;
    }
  };

  getAvailability = async (req: Request, res: Response): Promise<void> => {
    const publicKey = req.params.publicKey;

    if (typeof publicKey !== "string" || publicKey.length === 0) {
      res.status(400).json({
        error: {
          code: "INVALID_PUBLIC_KEY",
          message: "La clave pública no es válida."
        }
      });
      return;
    }

    try {
      const slots = await this.service.getAvailability(publicKey, {
        serviceId: req.query.serviceId,
        date: req.query.date,
        professionalId: req.query.professionalId
      });

      res.status(200).json(
        slots.map((slot) => ({
          startAt: slot.startAt.toISOString(),
          endAt: slot.endAt.toISOString(),
          professionals: slot.professionals
        }))
      );
    } catch (error) {
      if (error instanceof PublicSiteNotFoundError) {
        res.status(404).json({
          error: {
            code: "PUBLIC_SITE_NOT_FOUND",
            message: "El sitio no está disponible para reservas."
          }
        });
        return;
      }

      if (error instanceof AvailabilityUnavailableError) {
        res.status(404).json({
          error: {
            code: "AVAILABILITY_NOT_AVAILABLE",
            message: error.message
          }
        });
        return;
      }

      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "Los parámetros de disponibilidad no son válidos."
          }
        });
        return;
      }

      throw error;
    }
  };
}


  createAppointment = async (req: Request, res: Response): Promise<void> => {
    const publicKey = req.params.publicKey;

    if (typeof publicKey !== "string" || publicKey.length === 0) {
      res.status(400).json({
        error: {
          code: "INVALID_PUBLIC_KEY",
          message: "La clave pública no es válida."
        }
      });
      return;
    }

    try {
      const appointment = await this.service.createAppointment(publicKey, req.body);

      res.status(201).json({
        id: appointment.id,
        serviceId: appointment.serviceId,
        professionalId: appointment.professionalId,
        startAt: appointment.startAt.toISOString(),
        endAt: appointment.endAt.toISOString(),
        status: appointment.status
      });
    } catch (error) {
      if (error instanceof PublicSiteNotFoundError) {
        res.status(404).json({
          error: {
            code: "PUBLIC_SITE_NOT_FOUND",
            message: "El sitio no está disponible para reservas."
          }
        });
        return;
      }

      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "Los datos del turno no son válidos."
          }
        });
        return;
      }

      if (error instanceof AppointmentConflictError) {
        res.status(409).json({
          error: {
            code: "APPOINTMENT_CONFLICT",
            message: error.message
          }
        });
        return;
      }

      if (error instanceof AppointmentUnavailableError) {
        res.status(409).json({
          error: {
            code: "APPOINTMENT_UNAVAILABLE",
            message: error.message
          }
        });
        return;
      }

      throw error;
    }
  };
