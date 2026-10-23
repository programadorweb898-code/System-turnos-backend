import { createHash } from "node:crypto";
import { Request, Response, Router } from "express";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { publicAppointmentRateLimiter } from "../../middleware/rate-limit.js";
import {
  AppointmentManagementRepository,
  ManagedAppointmentNotFoundError,
  ManagedAppointmentStateError,
  ManagedAppointmentUnavailableError
} from "../appointments/appointment.management.repository.js";
import {
  appointmentIdSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema
} from "../appointments/appointment.management.validation.js";

interface PublicAppointment {
  id: string;
  tenantName: string;
  serviceName: string;
  professionalName: string;
  startAt: Date;
  endAt: Date;
  status: string;
}

export class PublicAppointmentManagementController {
  private readonly management: AppointmentManagementRepository;

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    this.management = new AppointmentManagementRepository(dataSource);
  }

  private async find(id: string, tokenHash: string, publicKey: string): Promise<PublicAppointment> {
    const rows: PublicAppointment[] = await this.dataSource.query(
      `SELECT a.id, t.name AS "tenantName", s.name AS "serviceName",
              e.name AS "professionalName", a.start_at AS "startAt",
              a.end_at AS "endAt", a.status
       FROM appointment_access_tokens access
       JOIN appointments a ON a.id = access.appointment_id AND a.tenant_id = access.tenant_id
       JOIN website_integrations wi ON wi.tenant_id = a.tenant_id AND wi.public_key = $3
       JOIN tenants t ON t.id = a.tenant_id
       JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
       JOIN employees e ON e.id = a.professional_id AND e.tenant_id = a.tenant_id
       WHERE a.id = $1 AND access.token_hash = $2
         AND access.revoked_at IS NULL AND access.expires_at > now()`,
      [id, tokenHash, publicKey]
    );
    if (rows.length !== 1) throw new ManagedAppointmentNotFoundError("El turno no existe.");
    return rows[0];
  }

  private async tenantId(id: string, tokenHash: string, publicKey: string): Promise<string> {
    const rows: Array<{ tenant_id: string }> = await this.dataSource.query(
      `SELECT access.tenant_id FROM appointment_access_tokens access
       JOIN website_integrations wi ON wi.tenant_id = access.tenant_id AND wi.public_key = $3
       WHERE access.appointment_id = $1 AND access.token_hash = $2
         AND access.revoked_at IS NULL AND access.expires_at > now()`,
      [id, tokenHash, publicKey]
    );
    if (rows.length !== 1) throw new ManagedAppointmentNotFoundError("El turno no existe.");
    return rows[0].tenant_id;
  }

  private credentials(req: Request, res: Response): { id: string; tokenHash: string } | null {
    const id = appointmentIdSchema.safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "El identificador no es válido." } });
      return null;
    }
    const authorization = req.header("authorization");
    if (!authorization) {
      res.status(401).json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Se requiere el enlace privado." } });
      return null;
    }
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
    if (!match) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "La credencial no es válida." } });
      return null;
    }
    return { id: id.data, tokenHash: createHash("sha256").update(match[1]).digest("hex") };
  }

  private respondError(res: Response, error: unknown): boolean {
    if (error instanceof ManagedAppointmentNotFoundError) {
      res.status(404).json({ error: { code: "APPOINTMENT_NOT_FOUND", message: "El turno no existe." } });
      return true;
    }
    if (error instanceof ManagedAppointmentStateError) {
      res.status(409).json({ error: { code: "APPOINTMENT_NOT_MODIFIABLE", message: error.message } });
      return true;
    }
    if (error instanceof ManagedAppointmentUnavailableError) {
      res.status(409).json({ error: { code: "APPOINTMENT_CONFLICT", message: error.message } });
      return true;
    }
    return false;
  }

  get = async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const credentials = this.credentials(req, res);
    if (!credentials) return;
    try {
      res.status(200).json(await this.find(credentials.id, credentials.tokenHash, String(req.params.publicKey)));
    } catch (error) {
      if (!this.respondError(res, error)) throw error;
    }
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const credentials = this.credentials(req, res);
    if (!credentials) return;
    const parsed = cancelAppointmentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Los datos de cancelación no son válidos." } });
      return;
    }
    try {
      const tenantId = await this.tenantId(credentials.id, credentials.tokenHash, String(req.params.publicKey));
      await this.management.cancel(tenantId, credentials.id, null, parsed.data.reason || null, credentials.tokenHash);
      res.status(200).json(await this.find(credentials.id, credentials.tokenHash, String(req.params.publicKey)));
    } catch (error) {
      if (!this.respondError(res, error)) throw error;
    }
  };

  reschedule = async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const credentials = this.credentials(req, res);
    if (!credentials) return;
    const parsed = rescheduleAppointmentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Los datos de reprogramación no son válidos." } });
      return;
    }
    try {
      const tenantId = await this.tenantId(credentials.id, credentials.tokenHash, String(req.params.publicKey));
      await this.management.reschedule(
        tenantId, credentials.id, null, new Date(parsed.data.startAt),
        parsed.data.professionalId, credentials.tokenHash
      );
      res.status(200).json(await this.find(credentials.id, credentials.tokenHash, String(req.params.publicKey)));
    } catch (error) {
      if (!this.respondError(res, error)) throw error;
    }
  };
}

export function createPublicAppointmentManagementRouter(
  controller = new PublicAppointmentManagementController()
): Router {
  const router = Router({ mergeParams: true });
  router.use(publicAppointmentRateLimiter);
  router.get("/:id", controller.get);
  router.post("/:id/cancel", controller.cancel);
  router.post("/:id/reschedule", controller.reschedule);
  return router;
}
