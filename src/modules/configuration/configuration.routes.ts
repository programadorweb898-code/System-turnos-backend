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

  router.get(
    "/professionals",
    requireAuthentication(),
    configurationController.listEmployees
  );

  router.post(
    "/professionals",
    requireAuthentication(),
    configurationController.createEmployee
  );

  router.patch(
    "/professionals/:id/status",
    requireAuthentication(),
    configurationController.updateEmployeeStatus
  );

  router.get(
    "/business-hours",
    requireAuthentication(),
    configurationController.listBusinessHours
  );

  router.post(
    "/business-hours",
    requireAuthentication(),
    configurationController.createBusinessHour
  );

  return router;
};
