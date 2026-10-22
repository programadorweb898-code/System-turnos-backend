import { Request, Response } from "express";
import { Tenant } from "../../database/entities/tenant.entity.js";
import {
  TenantNotFoundError,
  TenantNotReadyError,
  TenantService,
  TenantSlugAlreadyExistsError
} from "./tenant.service.js";
import {
  InvalidTenantInputError,
  updateTenantRequestSchema
} from "./tenant.validation.js";

const toTenantResponse = (tenant: Tenant) => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  timezone: tenant.timezone,
  status: tenant.status,
  maxDailyAppointments: tenant.maxDailyAppointments,
  minimumBookingNoticeHours: tenant.minimumBookingNoticeHours
});

export class TenantController {
  constructor(private readonly tenantService = new TenantService()) {}

  getCurrent = async (req: Request, res: Response): Promise<void> => {
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

    try {
      const tenant = await this.tenantService.getById(tenantId);

      res.status(200).json(toTenantResponse(tenant));
    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        res.status(404).json({
          error: {
            code: "TENANT_NOT_FOUND",
            message: "El negocio no existe."
          }
        });
        return;
      }

      throw error;
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
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

    const result = updateTenantRequestSchema.safeParse(req.body ?? {});

    if (!result.success) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos del negocio no son válidos."
        }
      });
      return;
    }

    try {
      const tenant = await this.tenantService.update(tenantId, result.data);

      res.status(200).json(toTenantResponse(tenant));
    } catch (error) {
      if (error instanceof InvalidTenantInputError) {
        res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: error.message
          }
        });
        return;
      }

      if (error instanceof TenantSlugAlreadyExistsError) {
        res.status(409).json({
          error: {
            code: "SLUG_ALREADY_EXISTS",
            message: error.message
          }
        });
        return;
      }

      if (error instanceof TenantNotFoundError) {
        res.status(404).json({
          error: {
            code: "TENANT_NOT_FOUND",
            message: error.message
          }
        });
        return;
      }

      throw error;
    }
  };

  publish = async (req: Request, res: Response): Promise<void> => {
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

    try {
      const tenant = await this.tenantService.publish(tenantId);

      res.status(200).json({ status: tenant.status });
    } catch (error) {
      if (error instanceof TenantNotReadyError) {
        res.status(409).json({
          error: {
            code: "TENANT_NOT_READY",
            message: error.message,
            details: error.details
          }
        });
        return;
      }

      if (error instanceof TenantNotFoundError) {
        res.status(404).json({
          error: {
            code: "TENANT_NOT_FOUND",
            message: error.message
          }
        });
        return;
      }

      throw error;
    }
  };

  unpublish = async (req: Request, res: Response): Promise<void> => {
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

    try {
      const tenant = await this.tenantService.unpublish(tenantId);

      res.status(200).json({ status: tenant.status });
    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        res.status(404).json({
          error: {
            code: "TENANT_NOT_FOUND",
            message: error.message
          }
        });
        return;
      }

      throw error;
    }
  };
}
