import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AuthenticatedUser } from "./auth.types.js";
import { requireAuthentication } from "./auth.middleware.js";
import { UserRepository } from "./user.repository.js";

describe("requireAuthentication", () => {
  const jwtSecret = "test-secret";

  function createResponseMock() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  }

  function createUserRepositoryMock() {
    return {
      findById: jest.fn()
    };
  }

  beforeEach(() => {
    env.jwtSecret = jwtSecret;
  });

  it("autentica un usuario activo y agrega su identidad al request", async () => {
    const repository = createUserRepositoryMock();
    repository.findById.mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      status: "ACTIVE"
    });

    const middleware = requireAuthentication(repository as unknown as UserRepository);
    const req = {
      header: jest.fn().mockReturnValue(
        `Bearer ${jwt.sign({ sub: "user-1" }, jwtSecret)}`
      )
    } as never;
    const res = createResponseMock();
    const next = jest.fn();

    await middleware(req, res as never, next);

    expect(repository.findById).toHaveBeenCalledWith("user-1");
    expect((req as { authenticatedUser?: AuthenticatedUser }).authenticatedUser).toEqual({
      id: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN"
    });
    expect(next).toHaveBeenCalled();
  });

  it("rechaza una request sin token", async () => {
    const repository = createUserRepositoryMock();
    const middleware = requireAuthentication(repository as unknown as UserRepository);
    const req = {
      header: jest.fn().mockReturnValue(undefined)
    } as never;
    const res = createResponseMock();
    const next = jest.fn();

    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rechaza un token inválido", async () => {
    const repository = createUserRepositoryMock();
    const middleware = requireAuthentication(repository as unknown as UserRepository);
    const req = {
      header: jest.fn().mockReturnValue("Bearer invalid-token")
    } as never;
    const res = createResponseMock();
    const next = jest.fn();

    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("rechaza un usuario inexistente", async () => {
    const repository = createUserRepositoryMock();
    repository.findById.mockResolvedValue(null);

    const middleware = requireAuthentication(repository as unknown as UserRepository);
    const token = jwt.sign({ sub: "deleted-user" }, jwtSecret);
    const req = {
      header: jest.fn().mockReturnValue(`Bearer ${token}`)
    } as never;
    const res = createResponseMock();
    const next = jest.fn();

    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rechaza un usuario deshabilitado", async () => {
    const repository = createUserRepositoryMock();
    repository.findById.mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      status: "DISABLED"
    });

    const middleware = requireAuthentication(repository as unknown as UserRepository);
    const token = jwt.sign({ sub: "user-1" }, jwtSecret);
    const req = {
      header: jest.fn().mockReturnValue(`Bearer ${token}`)
    } as never;
    const res = createResponseMock();
    const next = jest.fn();

    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
