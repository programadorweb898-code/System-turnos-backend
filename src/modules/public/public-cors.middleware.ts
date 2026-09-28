import { Request, Response, NextFunction } from "express";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { WebsiteIntegrationOrigin } from "../../database/entities/website-integration-origin.entity.js";
import { WebsiteIntegration } from "../../database/entities/website-integration.entity.js";

export class PublicCorsRepository {
  constructor(
    private readonly dataSource: DataSource = AppDataSource,
    private readonly widgetOrigin = process.env.PUBLIC_WIDGET_ORIGIN ?? ""
  ) {}

  async isAllowedOrigin(publicKey: string, origin: string): Promise<boolean> {
    if (this.widgetOrigin && origin === this.widgetOrigin) {
      return this.isActiveIntegration(publicKey);
    }

    const result = await this.dataSource
      .getRepository(WebsiteIntegrationOrigin)
      .createQueryBuilder("origin")
      .innerJoin(
        WebsiteIntegration,
        "integration",
        "integration.id = origin.website_integration_id"
      )
      .where("integration.public_key = :publicKey", { publicKey })
      .andWhere("integration.verification_status = 'VERIFIED'")
      .andWhere("integration.integration_status = 'CONNECTED'")
      .andWhere("origin.origin = :origin", { origin })
      .getOne();

    return Boolean(result);
  }

  private async isActiveIntegration(publicKey: string): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(WebsiteIntegration)
      .createQueryBuilder("integration")
      .where("integration.public_key = :publicKey", { publicKey })
      .andWhere("integration.verification_status = 'VERIFIED'")
      .andWhere("integration.integration_status = 'CONNECTED'")
      .getOne();

    return Boolean(result);
  }
}

export const createPublicCorsMiddleware = (
  repository = new PublicCorsRepository()
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const origin = req.header("Origin");
    const publicKey = req.params.publicKey;

    res.vary("Origin");

    if (!origin) {
      next();
      return;
    }

    if (typeof publicKey !== "string" || publicKey.length === 0) {
      res.status(400).json({
        error: {
          code: "INVALID_PUBLIC_KEY",
          message: "La clave pública no es válida."
        }
      });
      return;
    }

    const allowed = await repository.isAllowedOrigin(publicKey, origin);

    if (!allowed) {
      res.status(403).json({
        error: {
          code: "CORS_ORIGIN_NOT_ALLOWED",
          message: "El origen no está autorizado para esta integración."
        }
      });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
};
