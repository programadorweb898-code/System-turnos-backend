import { Request, Response } from "express";
import { ConfigurationService } from "./configuration.service.js";
import {
  createBusinessHourRequestSchema,
  createEmployeeRequestSchema,
  createServiceRequestSchema,
  updateEmployeeStatusRequestSchema
} from "./configuration.validation.js";

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
  };

  listEmployees = async (req: Request, res: Response): Promise<void> => {
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

    const employees = await this.configurationService.listEmployees(tenantId);

    res.status(200).json(
      employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        status: employee.status
      }))
    );
  };

  createEmployee = async (req: Request, res: Response): Promise<void> => {
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

    const result = createEmployeeRequestSchema.safeParse(req.body ?? {});

    if (!result.success) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos del profesional no son válidos."
        }
      });
      return;
    }

    const employee = await this.configurationService.createEmployee({
      tenantId,
      name: result.data.name
    });

    res.status(201).json({
      id: employee.id,
      name: employee.name,
      status: employee.status
    });
  };

  updateEmployeeStatus = async (req: Request, res: Response): Promise<void> => {
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

    const result = updateEmployeeStatusRequestSchema.safeParse(req.body ?? {});

    if (!result.success || typeof req.params.id !== "string") {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos del estado del profesional no son válidos."
        }
      });
      return;
    }

    const employee = await this.configurationService.updateEmployeeStatus({
      tenantId,
      employeeId: req.params.id,
      status: result.data.status
    });

    if (!employee) {
      res.status(404).json({
        error: {
          code: "PROFESSIONAL_NOT_FOUND",
          message: "El profesional no existe."
        }
      });
      return;
    }

    res.status(200).json({
      id: employee.id,
      name: employee.name,
      status: employee.status
    });
  };

  listBusinessHours = async (req: Request, res: Response): Promise<void> => {
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

    const businessHours = await this.configurationService.listBusinessHours(tenantId);

    res.status(200).json(
      businessHours.map((businessHour) => ({
        id: businessHour.id,
        dayOfWeek: businessHour.dayOfWeek,
        startTime: businessHour.startTime.slice(0, 5),
        endTime: businessHour.endTime.slice(0, 5)
      }))
    );
  };

  createBusinessHour = async (req: Request, res: Response): Promise<void> => {
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

    const result = createBusinessHourRequestSchema.safeParse(req.body ?? {});

    if (!result.success) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos del horario no son válidos."
        }
      });
      return;
    }

    const businessHour = await this.configurationService.createBusinessHour({
      tenantId,
      ...result.data
    });

    res.status(201).json({
      id: businessHour.id,
      dayOfWeek: businessHour.dayOfWeek,
      startTime: businessHour.startTime.slice(0, 5),
      endTime: businessHour.endTime.slice(0, 5)
    });
  };

}
