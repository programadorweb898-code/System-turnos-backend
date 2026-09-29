import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { AppDataSource } from "../database/data-source.js";
import { createApp } from "../app.js";

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

describe("health checks", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("responde 200 en /health sin tocar la base de datos", async () => {
    const query = jest.spyOn(AppDataSource, "query");
    const { server, baseUrl } = await listen(createApp());

    try {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok" });
      expect(query).not.toHaveBeenCalled();
    } finally {
      await close(server);
    }
  });

  it("responde 200 en /health/ready cuando la base responde", async () => {
    jest.spyOn(AppDataSource, "query").mockResolvedValue([{ "1": 1 }]);
    const { server, baseUrl } = await listen(createApp());

    try {
      const response = await fetch(`${baseUrl}/health/ready`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok", database: "up" });
    } finally {
      await close(server);
    }
  });

  it("responde 503 en /health/ready cuando la base falla", async () => {
    jest
      .spyOn(AppDataSource, "query")
      .mockRejectedValue(new Error("ECONNREFUSED"));
    const { server, baseUrl } = await listen(createApp());

    try {
      const response = await fetch(`${baseUrl}/health/ready`);

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "La base de datos no está disponible."
        }
      });
    } finally {
      await close(server);
    }
  });
});
