import { Request, Response } from "express";
import {
  WebsiteIntegrationAlreadyExistsError,
  WebsiteIntegrationNotFoundError,
  WebsiteIntegrationNotVerifiedError,
  WebsiteIntegrationService
} from "./website-integration.service.js";
import {
  parseCreateWebsiteIntegrationRequest
} from "./website-integration.validation.js";

export class WebsiteIntegrationController {
  constructor(
    private readonly service = new WebsiteIntegrationService()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
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

    const integrations = await this.service.list(tenantId);

    res.status(200).json(
      integrations.map((integration) => ({
        id: integration.id,
        domain: integration.domain,
        publicKey: integration.publicKey,
        verificationStatus: integration.verificationStatus,
        verificationMethod: integration.verificationMethod,
        integrationProvider: integration.integrationProvider,
        integrationStatus: integration.integrationStatus,
        verifiedAt: integration.verifiedAt,
        connectedAt: integration.connectedAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      }))
    );
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId || typeof req.params.id !== "string") {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Se requiere autenticación."
        }
      });
      return;
    }

    try {
      const integration = await this.service.getById(req.params.id, tenantId);

      res.status(200).json({
        id: integration.id,
        domain: integration.domain,
        publicKey: integration.publicKey,
        verificationStatus: integration.verificationStatus,
        verificationMethod: integration.verificationMethod,
        integrationProvider: integration.integrationProvider,
        integrationStatus: integration.integrationStatus,
        verifiedAt: integration.verifiedAt,
        connectedAt: integration.connectedAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      });
    } catch (error) {
      if (error instanceof WebsiteIntegrationNotFoundError) {
        res.status(404).json({
          error: {
            code: "WEBSITE_INTEGRATION_NOT_FOUND",
            message: "La integración del sitio no existe."
          }
        });
        return;
      }

      throw error;
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
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

    let input: ReturnType<typeof parseCreateWebsiteIntegrationRequest>;

    try {
      input = parseCreateWebsiteIntegrationRequest(req.body ?? {});
    } catch {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos de la integración no son válidos."
        }
      });
      return;
    }

    try {
      const integration = await this.service.create({
        tenantId,
        ...input
      });

      res.status(201).json({
        id: integration.id,
        domain: integration.domain,
        publicKey: integration.publicKey,
        verificationStatus: integration.verificationStatus,
        verificationMethod: integration.verificationMethod,
        integrationProvider: integration.integrationProvider,
        integrationStatus: integration.integrationStatus
      });
    } catch (error) {
      if (error instanceof WebsiteIntegrationAlreadyExistsError) {
        res.status(409).json({
          error: {
            code: "WEBSITE_INTEGRATION_ALREADY_EXISTS",
            message: "Ya existe una integración para este dominio."
          }
        });
        return;
      }

      throw error;
    }
  };

  connect = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId || typeof req.params.id !== "string") {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Se requiere autenticación."
        }
      });
      return;
    }

    try {
      const integration = await this.service.connect(req.params.id, tenantId);

      res.status(200).json({
        id: integration.id,
        domain: integration.domain,
        publicKey: integration.publicKey,
        verificationStatus: integration.verificationStatus,
        integrationStatus: integration.integrationStatus,
        connectedAt: integration.connectedAt
      });
    } catch (error) {
      if (error instanceof Error && error.constructor.name === "WebsiteIntegrationNotFoundError") {
        res.status(404).json({
          error: {
            code: "WEBSITE_INTEGRATION_NOT_FOUND",
            message: "La integración del sitio no existe."
          }
        });
        return;
      }

      if (error instanceof WebsiteIntegrationNotVerifiedError) {
        res.status(409).json({
          error: {
            code: "DOMAIN_NOT_VERIFIED",
            message: "El dominio debe estar verificado antes de conectar la integración."
          }
        });
        return;
      }

      throw error;
    }
  };
}
