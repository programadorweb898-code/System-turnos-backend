import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { createApp } from "../app.js";

const TENANT_ID = "3f0d2a5c-8b41-4e2a-9f77-1c2d3e4f5a6b";

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

describe("rate limiting de autenticacion", () => {
  it("responde 429 con el envelope de error del contrato", async () => {
    const { server, baseUrl } = await listen(createApp());

    try {
      const body = JSON.stringify({
        email: "cualquiera@example.com",
        password: "incorrecta"
      });

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body
        });

        expect(response.status).not.toBe(429);
      }

      const limited = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body
      });

      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Demasiadas solicitudes. Intente nuevamente más tarde."
        }
      });
    } finally {
      await close(server);
    }
  });

  it("expone los limites de ventana y cantidad como constantes", async () => {
    const { AUTH_RATE_LIMIT_MAX_REQUESTS, AUTH_RATE_LIMIT_WINDOW_MS } = await import(
      "../middleware/rate-limit.js"
    );

    expect(AUTH_RATE_LIMIT_MAX_REQUESTS).toBe(10);
    expect(AUTH_RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it("no limita los endpoints que no son de autenticacion", async () => {
    const { server, baseUrl } = await listen(createApp());

    try {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/v1/public/tenants/${TENANT_ID}`);

        expect(response.status).not.toBe(429);
      }
    } finally {
      await close(server);
    }
  });
});

describe("createApp trust proxy", () => {
  it("no confia en proxies cuando TRUST_PROXY_HOPS no esta definido", () => {
    const previous = process.env.TRUST_PROXY_HOPS;
    delete process.env.TRUST_PROXY_HOPS;

    try {
      jest.resetModules();
      const previousNodeEnv = process.env.NODE_ENV;
      const previousJwtSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "12345678901234567890123456789012";
      process.env.NODE_ENV = "test";

      const fresh = require("../app.js") as typeof import("../app.js");

      expect(fresh.createApp().get("trust proxy")).toBe(0);

      process.env.NODE_ENV = previousNodeEnv;
      if (previousJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = previousJwtSecret;
      }
    } finally {
      if (previous === undefined) {
        delete process.env.TRUST_PROXY_HOPS;
      } else {
        process.env.TRUST_PROXY_HOPS = previous;
      }
    }
  });
});
