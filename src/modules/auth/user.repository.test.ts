import bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { User } from "../../database/entities/user.entity.js";
import { UserRepository } from "./user.repository.js";

describe("UserRepository", () => {
  function createRepositoryMock() {
    return {
      create: jest.fn((values: Partial<User>) => values as User),
      findOne: jest.fn(),
      save: jest.fn(async (user: User) => user)
    };
  }

  function createRepository(typeormRepository: ReturnType<typeof createRepositoryMock>): UserRepository {
    return new UserRepository(
      typeormRepository as unknown as Repository<User>
    );
  }

  it("busca un usuario por id", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { id: "user-1" } as User;
    typeormRepository.findOne.mockResolvedValue(user);

    const result = await createRepository(typeormRepository).findById("user-1");

    expect(typeormRepository.findOne).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(result).toBe(user);
  });

  it("busca un usuario por email", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { email: "admin@example.com" } as User;
    typeormRepository.findOne.mockResolvedValue(user);

    const result = await createRepository(typeormRepository).findByEmail(
      "admin@example.com"
    );

    expect(typeormRepository.findOne).toHaveBeenCalledWith({
      where: { email: "admin@example.com" }
    });
    expect(result).toBe(user);
  });

  it("hashea la contraseña antes de guardarla", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { id: "user-1", passwordHash: "plain-text-value" } as User;

    const result = await createRepository(typeormRepository).save(user);

    expect(result.passwordHash).not.toBe("plain-text-value");
    await expect(bcrypt.compare("plain-text-value", result.passwordHash)).resolves.toBe(true);
    expect(typeormRepository.save).toHaveBeenCalledWith(user);
  });

  it("no vuelve a hashear una contraseña que ya es bcrypt", async () => {
    const typeormRepository = createRepositoryMock();
    const passwordHash = await bcrypt.hash("another-plain-value", 12);
    const user = { id: "user-1", passwordHash } as User;

    const result = await createRepository(typeormRepository).save(user);

    expect(result.passwordHash).toBe(passwordHash);
    await expect(bcrypt.compare("another-plain-value", result.passwordHash)).resolves.toBe(true);
  });

  it("crea un usuario activo del tenant hasheando la contraseña en claro", async () => {
    const typeormRepository = createRepositoryMock();
    const created: Array<Partial<User>> = [];
    typeormRepository.create.mockImplementation((values: Partial<User>) => {
      created.push({ ...values });
      return values as User;
    });

    const result = await createRepository(typeormRepository).create(
      "admin@example.com",
      "plain-text-value",
      "tenant-1"
    );

    expect(created[0]).toEqual({
      email: "admin@example.com",
      passwordHash: "plain-text-value",
      role: "ADMIN",
      status: "ACTIVE",
      tenantId: "tenant-1"
    });
    expect(result.passwordHash).not.toBe("plain-text-value");
    await expect(bcrypt.compare("plain-text-value", result.passwordHash)).resolves.toBe(true);
    expect(typeormRepository.save).toHaveBeenCalledTimes(1);
  });

  it("acepta un rol explicito al crear el usuario", async () => {
    const typeormRepository = createRepositoryMock();

    await createRepository(typeormRepository).create(
      "admin@example.com",
      "plain-text-value",
      "tenant-1",
      "ADMIN"
    );

    expect(typeormRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "ADMIN" })
    );
  });
});
