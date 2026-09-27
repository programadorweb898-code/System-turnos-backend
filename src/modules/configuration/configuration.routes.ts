import { Router } from "express";
import { requireAuthentication } from "../auth/auth.middleware.js";
import { ConfigurationController } from "./configuration.controller.js";

export const createConfigurationRouter = (
  configurationController = new ConfigurationController()
): Router => {
  const router = Router();

  router.get(
    "/services",
    requireAuthentication(),
    configurationController.listServices
  );

  router.post(
    "/services",
    requireAuthentication(),
    configurationController.createService
  );

  return router;
};
