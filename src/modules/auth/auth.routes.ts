import { Router } from "express";
import { AuthController } from "./auth.controller.js";

export const createAuthRouter = (
  authController = new AuthController()
): Router => {
  const router = Router();

  router.post("/login", authController.login);

  return router;
};
