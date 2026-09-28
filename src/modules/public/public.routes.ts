import { Router } from "express";
import { PublicController } from "./public.controller.js";

export const createPublicRouter = (
  controller = new PublicController()
): Router => {
  const router = Router();

  router.get("/sites/:publicKey", controller.getSite);
  router.get("/sites/:publicKey/services", controller.listServices);

  return router;
};
