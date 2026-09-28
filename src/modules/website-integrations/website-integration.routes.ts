import { Router } from "express";
import { requireAuthentication } from "../auth/auth.middleware.js";
import { WebsiteIntegrationController } from "./website-integration.controller.js";

export const createWebsiteIntegrationRouter = (
  controller = new WebsiteIntegrationController()
): Router => {
  const router = Router();

  router.get("/", requireAuthentication(), controller.list);
  router.post("/", requireAuthentication(), controller.create);
  router.get("/:id", requireAuthentication(), controller.getById);
  router.post("/:id/verify", requireAuthentication(), controller.verify);
  router.post("/:id/connect", requireAuthentication(), controller.connect);

  return router;
};
