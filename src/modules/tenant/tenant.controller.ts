import { Request, Response } from "express";
import {
  TenantNotFoundError,
  TenantNotReadyError,
  TenantService
} from "./tenant.service.js";

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

      res.status(200).json({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        status: tenant.status,
        maxDailyAppointments: tenant.maxDailyAppointments,
        minimumBookingNoticeHours: tenant.minimumBookingNoticeHours
      });
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
