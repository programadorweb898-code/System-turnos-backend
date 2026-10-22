import { Router } from "express";
import { requireAuthentication } from "../auth/auth.middleware.js";
import { TenantController } from "./tenant.controller.js";

export const createTenantRouter = (
  tenantController = new TenantController()
): Router => {
  const router = Router();

  router.get("/tenant", requireAuthentication(), tenantController.getCurrent);

  router.patch("/tenant", requireAuthentication(), tenantController.update);

  router.post(
    "/tenant/publication",
    requireAuthentication(),
    tenantController.publish
  );

  router.post(
    "/tenant/unpublication",
    requireAuthentication(),
    tenantController.unpublish
  );

  return router;
};
