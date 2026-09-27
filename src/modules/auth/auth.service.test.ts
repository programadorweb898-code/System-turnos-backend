import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../../database/entities/user.entity.js";
import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
  const jwtSecret = "test-secret";

  function createUserRepositoryMock() {
    return {
      findByEmail: jest.fn()
    };
  }

  function createUser(overrides: Partial<User> = {}): User {
    return {
      id: "user-1",
      email: "admin@example.com",
      passwordHash: "",
      role: "ADMIN",
      status: "ACTIVE",
      tenantId: "tenant-1",
      ...overrides
    } as User;
  }

  it("autentica un usuario activo y genera un JWT con su id", async () => {
    const repository = createUserRepositoryMock();
    const passwordHash = await bcrypt.hash("password123", 10);
    const user = createUser({ passwordHash });

    repository.findByEmail.mockResolvedValue(user);

    const service = new AuthService(repository, jwtSecret);

    const result = await service.login({
      email: " ADMIN@EXAMPLE.COM ",
      password: "password123"
    });

    expect(repository.findByEmail).toHaveBeenCalledWith("admin@example.com");
    expect(result.user).toEqual({
      id: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN"
    });

    const payload = jwt.verify(result.accessToken, jwtSecret) as jwt.JwtPayload;

    expect(payload.sub).toBe("user-1");
  });

  it("rechaza credenciales incorrectas", async () => {
    const repository = createUserRepositoryMock();
    const passwordHash = await bcrypt.hash("password123", 10);
    repository.findByEmail.mockResolvedValue(createUser({ passwordHash }));

    const service = new AuthService(repository, jwtSecret);

    await expect(
      service.login({
        email: "admin@example.com",
        password: "wrong-password"
      })
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("rechaza un usuario inexistente", async () => {
    const repository = createUserRepositoryMock();
    repository.findByEmail.mockResolvedValue(null);

    const service = new AuthService(repository, jwtSecret);

    await expect(
      service.login({
        email: "unknown@example.com",
        password: "password123"
      })
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("rechaza un usuario deshabilitado", async () => {
    const repository = createUserRepositoryMock();
    repository.findByEmail.mockResolvedValue(
      createUser({ status: "DISABLED" })
    );

    const service = new AuthService(repository, jwtSecret);

    await expect(
      service.login({
        email: "admin@example.com",
        password: "password123"
      })
    ).rejects.toThrow("Usuario deshabilitado");
  });
});
