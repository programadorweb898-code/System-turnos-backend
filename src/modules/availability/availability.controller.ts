import { Request, Response } from "express";
import {
  AvailabilityService,
  AvailabilityUnavailableError
} from "./availability.service.js";
import { parseAvailabilityRequest } from "./availability.validation.js";

export class AvailabilityController {
  constructor(
    private readonly service = new AvailabilityService()
  ) {}

  getAvailability = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseAvailabilityRequest({
      serviceId: req.query.serviceId,
      date: req.query.date,
      professionalId: req.query.professionalId
    });

    const tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        error: {
          code: "TENANT_CONTEXT_REQUIRED",
          message: "El tenant debe determinarse desde el contexto de acceso."
        }
      });
      return;
    }

    try {
      const slots = await this.service.getAvailability({
        tenantId,
        ...parsed
      });

      res.status(200).json(
        slots.map((slot) => ({
          startAt: slot.startAt.toISOString(),
          endAt: slot.endAt.toISOString(),
          professionals: slot.professionals
        }))
      );
    } catch (error) {
      if (error instanceof AvailabilityUnavailableError) {
        res.status(404).json({
          error: {
            code: "AVAILABILITY_NOT_AVAILABLE",
            message: error.message
          }
        });
        return;
      }

      throw error;
    }
  };
}
