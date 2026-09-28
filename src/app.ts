import express, { ErrorRequestHandler } from "express";
import helmet from "helmet";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createConfigurationRouter } from "./modules/configuration/configuration.routes.js";
import { createTenantRouter } from "./modules/tenant/tenant.routes.js";
import { createWebsiteIntegrationRouter } from "./modules/website-integrations/website-integration.routes.js";
import { createPublicRouter } from "./modules/public/public.routes.js";
import { createAvailabilityRouter } from "./modules/availability/availability.routes.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok"
    });
  });

  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/admin", createTenantRouter());
  app.use("/api/v1/admin/configuration", createConfigurationRouter());
  app.use("/api/v1/admin/website-integrations", createWebsiteIntegrationRouter());
  app.use("/api/v1/public", createPublicRouter());
  app.use("/api/v1", createAvailabilityRouter());

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
