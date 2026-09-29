import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { createApp } from "../app.js";

const PUBLIC_KEY = "pk_live_test0000000000000000";

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

const APPOINTMENT_BODY = JSON.stringify({
  serviceId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  startAt: "2026-10-01T15:00:00.000Z",
  customerName: "Cliente de prueba",
  customerPhone: "5551234567"
});

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
      const statuses: number[] = [];

      for (let attempt = 0; attempt < 15; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/v1/public/sites/${PUBLIC_KEY}`);
        statuses.push(response.status);
      }

      expect(statuses.every((status) => status !== 429)).toBe(true);
      // Si la ruta no existiera, todas las respuestas serian 404 y la
      // asercion anterior pasaria sin comprobar nada. Este test hizo
      // justamente eso contra /api/v1/public/tenants/:id, que nunca existio.
      expect(statuses.some((status) => status !== 404)).toBe(true);
    } finally {
      await close(server);
    }
  });
});

describe("rate limiting de reserva publica de turnos", () => {
  it("responde 429 al superar el limite del endpoint publico", async () => {
    const { server, baseUrl } = await listen(createApp());

    try {
      const post = () =>
        fetch(`${baseUrl}/api/v1/public/sites/${PUBLIC_KEY}/appointments`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: APPOINTMENT_BODY
        });

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await post();

        expect(response.status).not.toBe(429);
      }

      const limited = await post();

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
    const {
      PUBLIC_APPOINTMENT_RATE_LIMIT_MAX_REQUESTS,
      PUBLIC_APPOINTMENT_RATE_LIMIT_WINDOW_MS
    } = await import("../middleware/rate-limit.js");

    expect(PUBLIC_APPOINTMENT_RATE_LIMIT_MAX_REQUESTS).toBe(10);
    expect(PUBLIC_APPOINTMENT_RATE_LIMIT_WINDOW_MS).toBe(60 * 1000);
  });

  it("no limita la lectura de disponibilidad del mismo sitio", async () => {
    const { server, baseUrl } = await listen(createApp());

    try {
      const statuses: number[] = [];

      for (let attempt = 0; attempt < 15; attempt += 1) {
        const response = await fetch(
          `${baseUrl}/api/v1/public/sites/${PUBLIC_KEY}/availability?serviceId=1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d&date=2026-10-01`
        );
        statuses.push(response.status);
      }

      expect(statuses.every((status) => status !== 429)).toBe(true);
    } finally {
      await close(server);
    }
  });
});

describe("rutas inexistentes", () => {
  it("responde 404 con el envelope de error del contrato", async () => {
    const { server, baseUrl } = await listen(createApp());

    try {
      const response = await fetch(`${baseUrl}/api/v1/admin/does-not-exist`);

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toEqual({
        error: {
          code: "NOT_FOUND",
          message: "El recurso solicitado no existe."
        }
      });
    } finally {
      await close(server);
    }
  });

  it("responde 404 tambien fuera del prefijo de la API", async () => {
    const { server, baseUrl } = await listen(createApp());

    try {
      const response = await fetch(`${baseUrl}/no-existe`);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: {
          code: "NOT_FOUND",
          message: "El recurso solicitado no existe."
        }
      });
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
