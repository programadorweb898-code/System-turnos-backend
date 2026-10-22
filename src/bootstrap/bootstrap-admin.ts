import "reflect-metadata";
import { env } from "../config/env.js";
import { AppDataSource } from "../database/data-source.js";
import { readBootstrapConfig } from "./bootstrap-admin.config.js";
import { createBootstrapAdminService } from "./bootstrap-admin.service.js";

async function bootstrapAdmin(): Promise<void> {
  if (!env.databaseUrl) {
    throw new Error("Falta la variable de entorno requerida: DATABASE_URL.");
  }

  const config = readBootstrapConfig(process.env);

  await AppDataSource.initialize();

  try {
    const result = await AppDataSource.transaction(async (manager) =>
      createBootstrapAdminService(manager).run(config)
    );

    console.log("Negocio y administrador creados.");
    console.log(`  Negocio:  ${result.tenantSlug} (${result.tenantId})`);
    console.log(`  Admin:    ${result.adminEmail} (${result.adminUserId})`);
    console.log("  Estado:   draft, pendiente de publicar desde el panel.");
  } finally {
    await AppDataSource.destroy();
  }
}

bootstrapAdmin().catch((error: unknown) => {
  console.error("No se pudo ejecutar el bootstrap de administrador:", error);
  process.exit(1);
});
