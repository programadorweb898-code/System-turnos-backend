import { User } from "../../database/entities/user.entity.js";
import { UserService, UserEmailAlreadyExistsError } from "./user.service.js";
import { UserController } from "./user.controller.js";

describe("UserController", () => {
  const validBody = {
    email: "admin@peluqueria-luis.test",
    password: "una-clave-larga-1"
  };

  function createResponseMock() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  }

  function createRequestMock(body: unknown, tenantId: string | null = "tenant-1") {
    return {
      body,
      authenticatedUser: tenantId
        ? { id: "user-1", tenantId, role: "ADMIN" }
        : undefined
    } as never;
  }

  it("crea el administrador del negocio del token", async () => {
    const user = {
      id: "user-2",
      email: "admin@peluqueria-luis.test",
      role: "ADMIN",
      status: "ACTIVE"
    } as User;
    const userService = { createAdmin: jest.fn().mockResolvedValue(user) };
    const response = createResponseMock();

    await new UserController(userService as unknown as UserService).createAdmin(
      createRequestMock(validBody),
      response as never
    );

    expect(userService.createAdmin).toHaveBeenCalledWith({
      ...validBody,
      tenantId: "tenant-1"
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      id: "user-2",
      email: "admin@peluqueria-luis.test",
      role: "ADMIN",
      status: "ACTIVE"
    });
  });

  it("ignora un tenantId enviado en el cuerpo", async () => {
    const userService = {
      createAdmin: jest.fn().mockResolvedValue({ id: "user-2" } as User)
    };
    const response = createResponseMock();

    await new UserController(userService as unknown as UserService).createAdmin(
      createRequestMock({ ...validBody, tenantId: "otro-negocio" }),
      response as never
    );

    expect(userService.createAdmin).toHaveBeenCalledWith({
      email: "admin@peluqueria-luis.test",
      password: "una-clave-larga-1",
      tenantId: "tenant-1"
    });
  });

  it("devuelve 401 sin usuario autenticado", async () => {
    const userService = { createAdmin: jest.fn() };
    const response = createResponseMock();

    await new UserController(userService as unknown as UserService).createAdmin(
      createRequestMock(validBody, null),
      response as never
    );

    expect(userService.createAdmin).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Se requiere autenticación."
      }
    });
  });

  it.each([
    ["cuerpo vacío", {}],
    ["contraseña corta", { ...validBody, password: "corta" }],
    ["email inválido", { ...validBody, email: "no-es-un-email" }]
  ])("devuelve 400 con %s", async (_case, body) => {
    const userService = { createAdmin: jest.fn() };
    const response = createResponseMock();

    await new UserController(userService as unknown as UserService).createAdmin(
      createRequestMock(body),
      response as never
    );

    expect(userService.createAdmin).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "INVALID_REQUEST",
        message: "Los datos del usuario no son válidos."
      }
    });
  });

  it("devuelve 409 cuando el email ya existe", async () => {
    const userService = {
      createAdmin: jest.fn().mockRejectedValue(new UserEmailAlreadyExistsError())
    };
    const response = createResponseMock();

    await new UserController(userService as unknown as UserService).createAdmin(
      createRequestMock(validBody),
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "Ya existe un usuario con ese email."
      }
    });
  });

  it("no expone el hash de la contraseña en la respuesta", async () => {
    const userService = {
      createAdmin: jest.fn().mockResolvedValue({
        id: "user-2",
        email: "admin@peluqueria-luis.test",
        role: "ADMIN",
        status: "ACTIVE",
        passwordHash: "$2b$12$hash"
      } as User)
    };
    const response = createResponseMock();

    await new UserController(userService as unknown as UserService).createAdmin(
      createRequestMock(validBody),
      response as never
    );

    expect(response.json).toHaveBeenCalledWith({
      id: "user-2",
      email: "admin@peluqueria-luis.test",
      role: "ADMIN",
      status: "ACTIVE"
    });
  });
});
