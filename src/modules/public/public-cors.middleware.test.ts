import { createPublicCorsMiddleware } from "./public-cors.middleware.js";

function createResponse() {
  const headers = new Map<string, string>();
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name, value);
      return res;
    }),
    vary: jest.fn(),
    end: jest.fn()
  };

  return { res, headers };
}

describe("public CORS middleware", () => {
  it("allows a registered origin", async () => {
    const repository = {
      isAllowedOrigin: jest.fn().mockResolvedValue(true)
    };

    const { res, headers } = createResponse();
    const next = jest.fn();

    await createPublicCorsMiddleware(repository as never)(
      {
        params: { publicKey: "pk_live_test" },
        method: "GET",
        header: (name: string) =>
          name === "Origin" ? "https://peluqueriajuan.com" : undefined
      } as never,
      res as never,
      next
    );

    expect(repository.isAllowedOrigin).toHaveBeenCalledWith(
      "pk_live_test",
      "https://peluqueriajuan.com"
    );
    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://peluqueriajuan.com"
    );
    expect(next).toHaveBeenCalled();
  });

  it("rejects an origin that is not registered", async () => {
    const repository = {
      isAllowedOrigin: jest.fn().mockResolvedValue(false)
    };

    const { res } = createResponse();

    await createPublicCorsMiddleware(repository as never)(
      {
        params: { publicKey: "pk_live_test" },
        method: "GET",
        header: () => "https://otro-sitio.com"
      } as never,
      res as never,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "CORS_ORIGIN_NOT_ALLOWED",
        message: "El origen no está autorizado para esta integración."
      }
    });
  });

  it("answers preflight requests without reaching the controller", async () => {
    const repository = {
      isAllowedOrigin: jest.fn().mockResolvedValue(true)
    };

    const { res } = createResponse();
    const next = jest.fn();

    await createPublicCorsMiddleware(repository as never)(
      {
        params: { publicKey: "pk_live_test" },
        method: "OPTIONS",
        header: () => "https://peluqueriajuan.com"
      } as never,
      res as never,
      next
    );

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("does not require CORS validation for requests without an Origin header", async () => {
    const repository = {
      isAllowedOrigin: jest.fn()
    };

    const { res } = createResponse();
    const next = jest.fn();

    await createPublicCorsMiddleware(repository as never)(
      {
        params: { publicKey: "pk_live_test" },
        method: "GET",
        header: () => undefined
      } as never,
      res as never,
      next
    );

    expect(repository.isAllowedOrigin).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
