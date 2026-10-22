import { AuthService, InvalidCredentialsError, UserDisabledError } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";

describe("AuthController", () => {
  function createResponseMock() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  }

  it("devuelve el resultado del login", async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({
        accessToken: "token",
        user: { id: "user-1", tenantId: "tenant-1", role: "ADMIN" }
      })
    };

    const controller = new AuthController(authService as unknown as AuthService);
    const response = createResponseMock();

    await controller.login(
      { body: { email: "admin@example.com", password: "password123" } } as never,
      response as never
    );

    expect(authService.login).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "password123"
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      accessToken: "token",
      user: { id: "user-1", tenantId: "tenant-1", role: "ADMIN" }
    });
  });

  it("rechaza una solicitud inválida", async () => {
    const authService = { login: jest.fn() };
    const controller = new AuthController(authService as unknown as AuthService);
    const response = createResponseMock();

    await controller.login(
      { body: { email: "admin@example.com" } } as never,
      response as never
    );

    expect(authService.login).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_REQUEST",
        message: "Email y contraseña son obligatorios"
      }
    });
  });

  it("devuelve 403 cuando el usuario está deshabilitado", async () => {
    const authService = {
      login: jest.fn().mockRejectedValue(new UserDisabledError())
    };
    const controller = new AuthController(authService as unknown as AuthService);
    const response = createResponseMock();

    await controller.login(
      { body: { email: "admin@example.com", password: "password123" } } as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: "USER_DISABLED", message: "Usuario deshabilitado" }
    });
  });

  it("devuelve 401 para credenciales inválidas", async () => {
    const authService = {
      login: jest.fn().mockRejectedValue(new InvalidCredentialsError())
    };
    const controller = new AuthController(authService as unknown as AuthService);
    const response = createResponseMock();

    await controller.login(
      { body: { email: "admin@example.com", password: "wrong-password" } } as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Credenciales inválidas"
      }
    });
  });
});
