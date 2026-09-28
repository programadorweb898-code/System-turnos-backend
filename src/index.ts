import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { AppDataSource } from "./database/data-source.js";

const requiredEnv = [
  ["DATABASE_URL", env.databaseUrl],
  ["JWT_SECRET", env.jwtSecret]
] as const;

for (const [name, value] of requiredEnv) {
  if (!value) {
    console.error(`Falta la variable de entorno requerida: ${name}`);
    process.exit(1);
  }
}

const app = createApp();
const port = env.port;

try {
  await AppDataSource.initialize();

  app.listen(port, () => {
    console.log(`Backend ejecutándose en el puerto ${port}`);
  });
} catch (error) {
  console.error("No se pudo inicializar la base de datos:", error);
  process.exit(1);
}
