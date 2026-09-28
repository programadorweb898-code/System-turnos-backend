import bcrypt from "bcryptjs";
import { User } from "../../database/entities/user.entity.js";
import { UserRepository } from "./user.repository.js";

describe("UserRepository", () => {
  function createRepositoryMock() {
    return {
      findOne: jest.fn(),
      save: jest.fn()
    };
  }

  it("busca un usuario por id", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { id: "user-1" } as User;
    typeormRepository.findOne.mockResolvedValue(user);

    const repository = new UserRepository();
    Object.defineProperty(repository, "repository", { value: typeormRepository });

    const result = await repository.findById("user-1");

    expect(typeormRepository.findOne).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(result).toBe(user);
  });

  it("busca un usuario por email", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { email: "admin@example.com" } as User;
    typeormRepository.findOne.mockResolvedValue(user);

    const repository = new UserRepository();
    Object.defineProperty(repository, "repository", { value: typeormRepository });

    const result = await repository.findByEmail("admin@example.com");

    expect(typeormRepository.findOne).toHaveBeenCalledWith({ where: { email: "admin@example.com" } });
    expect(result).toBe(user);
  });

  it("hashea la contraseña antes de guardarla", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { id: "user-1", passwordHash: "plain-text-value" } as User;
    typeormRepository.save.mockImplementation(async (savedUser: User) => savedUser);

    const repository = new UserRepository();
    Object.defineProperty(repository, "repository", { value: typeormRepository });

    const result = await repository.save(user);

    expect(result.passwordHash).not.toBe("plain-text-value");
    await expect(bcrypt.compare("plain-text-value", result.passwordHash)).resolves.toBe(true);
    expect(typeormRepository.save).toHaveBeenCalledWith(user);
  });

  it("no vuelve a hashear una contraseña que ya es bcrypt", async () => {
    const typeormRepository = createRepositoryMock();
    const passwordHash = await bcrypt.hash("another-plain-value", 12);
    const user = { id: "user-1", passwordHash } as User;
    typeormRepository.save.mockImplementation(async (savedUser: User) => savedUser);

    const repository = new UserRepository();
    Object.defineProperty(repository, "repository", { value: typeormRepository });

    const result = await repository.save(user);

    expect(result.passwordHash).toBe(passwordHash);
    await expect(bcrypt.compare("another-plain-value", result.passwordHash)).resolves.toBe(true);
  });
});