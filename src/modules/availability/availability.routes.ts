import { Router } from "express";
import { requireAuthentication } from "../auth/auth.middleware.js";
import { AvailabilityController } from "./availability.controller.js";

export const createAvailabilityRouter = (
  controller = new AvailabilityController()
): Router => {
  const router = Router();

  router.get(
    "/availability",
    requireAuthentication(),
    controller.getAvailability
  );

  return router;
};
