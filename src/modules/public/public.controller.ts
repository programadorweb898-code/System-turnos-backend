import { Request, Response } from "express";
import { PublicService, PublicSiteNotFoundError } from "./public.service.js";

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
}
