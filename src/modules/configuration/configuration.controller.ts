import { Request, Response } from "express";
import { ConfigurationService } from "./configuration.service.js";
import { createServiceRequestSchema } from "./configuration.validation.js";

export class ConfigurationController {
  constructor(
    private readonly configurationService = new ConfigurationService()
  ) {}

  listServices = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Se requiere autenticación."
        }
      });
      return;
    }

    const services = await this.configurationService.listServices(tenantId);

    res.status(200).json(
      services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration,
        status: service.status
      }))
    );
  };

  createService = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Se requiere autenticación."
        }
      });
      return;
    }

    const result = createServiceRequestSchema.safeParse(req.body ?? {});

    if (!result.success) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos del servicio no son válidos."
        }
      });
      return;
    }

    try {
      const service = await this.configurationService.createService({
        tenantId,
        ...result.data
      });

      res.status(201).json({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration,
        status: service.status
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          error: {
            code: "INVALID_SERVICE",
            message: error.message
          }
        });
        return;
      }

      throw error;
    }
  };
}
