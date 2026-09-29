import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { createApp } from "../app.js";
import { env } from "../config/env.js";

const TEST_JWT_SECRET = "secreto-de-pruebas-para-los-rutas-de-alta";
const originalJwtSecret = env.jwtSecret;

async function listen(app: ReturnType<typeof createApp>): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

const ADMIN_ROUTES = [
  {
    method: "POST",
    path: "/api/v1/admin/users",
    body: { email: "admin@example.test", password: "una-clave-larga-1" }
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/tenant",
    body: { maxDailyAppointments: 10 }
  }
] as const;

// Estas pruebas no tocan la base: el rechazo por falta de token ocurre antes de
// cualquier consulta. Su valor es comprobar que las rutas de alta quedaron
// montadas y protegidas, no el comportamiento del dominio.
describe("cableado y proteccion de las rutas de alta", () => {
  beforeAll(() => {
    env.jwtSecret = TEST_JWT_SECRET;
  });

  afterAll(() => {
    env.jwtSecret = originalJwtSecret;
  });

  it.each(ADMIN_ROUTES)(
    "$method $path responde 401 sin token",
    async ({ method, path, body }) => {
      const { server, baseUrl } = await listen(createApp());

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
          error: {
            code: "UNAUTHORIZED",
            message: "Token de autenticación requerido"
          }
        });
      } finally {
        await close(server);
      }
    }
  );

  it.each(ADMIN_ROUTES)(
    "$method $path responde 401 con un token invalido",
    async ({ method, path, body }) => {
      const { server, baseUrl } = await listen(createApp());

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            "content-type": "application/json",
            authorization: "Bearer token-invalido"
          },
          body: JSON.stringify(body)
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
          error: {
            code: "INVALID_TOKEN",
            message: "Token inválido"
          }
        });
      } finally {
        await close(server);
      }
    }
  );

  it("no expone el alta de usuarios fuera del prefijo de administracion", async () => {
    const { server, baseUrl } = await listen(createApp());

    try {
      const response = await fetch(`${baseUrl}/api/v1/users`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.test",
          password: "una-clave-larga-1"
        })
      });

      expect(response.status).toBe(404);
    } finally {
      await close(server);
    }
  });
});
