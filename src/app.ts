import express, { ErrorRequestHandler, Request, Response } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { AppDataSource } from "./database/data-source.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createUserRouter } from "./modules/auth/user.routes.js";
import { createConfigurationRouter } from "./modules/configuration/configuration.routes.js";
import { createTenantRouter } from "./modules/tenant/tenant.routes.js";
import { createWebsiteIntegrationRouter } from "./modules/website-integrations/website-integration.routes.js";
import { createPublicRouter } from "./modules/public/public.routes.js";
import { createAvailabilityRouter } from "./modules/availability/availability.routes.js";

export const createApp = () => {
  const app = express();

  // Detras de un proxy inverso sin esto, req.ip devuelve la IP del proxy y el
  // rate limiting por IP agruparia a todos los usuarios en un mismo contador.
  // Se confiar en un numero fijo de saltos y no en `true`, porque con `true`
  // un cliente podria falsear su IP mediante el header X-Forwarded-For y
  // evadir el limitador.
  app.set("trust proxy", env.trustProxyHops);

  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok"
    });
  });

  // Liveness (/health) solo prueba que el proceso responde. La readiness tiene
  // que consultar la base: sin ella, un deploy puede dar por sano un servicio
  // que no tiene migraciones aplicadas y le manda trafico para nada.
  app.get("/health/ready", async (_req, res) => {
    try {
      await AppDataSource.query("SELECT 1");
      res.status(200).json({
        status: "ok",
        database: "up"
      });
    } catch {
      res.status(503).json({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "La base de datos no está disponible."
        }
      });
    }
  });

  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/admin", createTenantRouter());
  app.use("/api/v1/admin", createUserRouter());
  app.use("/api/v1/admin/configuration", createConfigurationRouter());
  app.use("/api/v1/admin/website-integrations", createWebsiteIntegrationRouter());
  app.use("/api/v1/public", createPublicRouter());
  app.use("/api/v1", createAvailabilityRouter());

  // Sin este middleware, Express 5 responde a las rutas inexistentes con su
  // pagina HTML por defecto y el cliente recibe algo que no cumple el contrato
  // de error { error: { code, message } } que respetan el resto de handlers.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "El recurso solicitado no existe."
      }
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const status =
      typeof error?.status === "number" &&
      error.status >= 400 &&
      error.status < 500
        ? error.status
        : 500;

    if (status === 413) {
      res.status(413).json({
        error: {
          code: "REQUEST_TOO_LARGE",
          message: "El cuerpo de la solicitud es demasiado grande."
        }
      });
      return;
    }

    if (status >= 400 && status < 500) {
      res.status(status).json({
        error: {
          code: "INVALID_REQUEST",
          message: "La solicitud no es válida."
        }
      });
      return;
    }

    // Sin esto, un 500 sale en la respuesta pero no deja rastro en ningun lado:
    // en staging no hay forma de saber por que fallo. Se registra la causa real
    // y el cliente solo recibe el mensaje generico.
    console.error("Error no controlado:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Error interno del servidor."
      }
    });
  };

  app.use(errorHandler);

  return app;
};
