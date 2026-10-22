import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authRateLimiter } from "../../middleware/rate-limit.js";

export const createAuthRouter = (
  authController = new AuthController()
): Router => {
  const router = Router();

  router.post("/login", authRateLimiter, authController.login);

  return router;
};
