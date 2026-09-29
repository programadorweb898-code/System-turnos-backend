import { Router } from "express";
import { requireAuthentication } from "./auth.middleware.js";
import { UserController } from "./user.controller.js";

export const createUserRouter = (
  userController = new UserController()
): Router => {
  const router = Router();

  router.post("/users", requireAuthentication(), userController.createAdmin);

  return router;
};
