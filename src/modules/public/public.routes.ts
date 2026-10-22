import { Router } from "express";
import { publicAppointmentRateLimiter } from "../../middleware/rate-limit.js";
import { PublicController } from "./public.controller.js";
import { createPublicCorsMiddleware } from "./public-cors.middleware.js";

export const createPublicRouter = (
  controller = new PublicController()
): Router => {
  const router = Router();

  router.use("/sites/:publicKey", createPublicCorsMiddleware());

  router.get("/sites/:publicKey", controller.getSite);
  router.get("/sites/:publicKey/services", controller.listServices);
  router.get("/sites/:publicKey/availability", controller.getAvailability);
  router.post(
    "/sites/:publicKey/appointments",
    publicAppointmentRateLimiter,
    controller.createAppointment
  );

  return router;
};
