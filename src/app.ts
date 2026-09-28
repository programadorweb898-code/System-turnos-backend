import express from "express";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createConfigurationRouter } from "./modules/configuration/configuration.routes.js";
import { createTenantRouter } from "./modules/tenant/tenant.routes.js";
import { createWebsiteIntegrationRouter } from "./modules/website-integrations/website-integration.routes.js";
import { createPublicRouter } from "./modules/public/public.routes.js";
import { createAvailabilityRouter } from "./modules/availability/availability.routes.js";

export const createApp = () => {
  const app = express();

  app.use(express.json());

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

  return app;
};
