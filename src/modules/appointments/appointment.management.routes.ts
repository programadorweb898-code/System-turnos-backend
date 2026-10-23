import { Router } from "express";
import { requireAuthentication } from "../auth/auth.middleware.js";
import { AppointmentManagementController } from "./appointment.management.controller.js";

export const createAppointmentManagementRouter = (
  controller = new AppointmentManagementController()
): Router => {
  const router = Router();

  router.get("/appointments", requireAuthentication(), controller.list);
  router.post("/appointments/:id/cancel", requireAuthentication(), controller.cancel);
  router.post("/appointments/:id/reschedule", requireAuthentication(), controller.reschedule);

  return router;
};
