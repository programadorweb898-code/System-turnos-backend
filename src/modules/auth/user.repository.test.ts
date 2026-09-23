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
    Object.defineProperty(repository, "repository", {
      value: typeormRepository
    });

    const result = await repository.findById("user-1");

    expect(typeormRepository.findOne).toHaveBeenCalledWith({
      where: { id: "user-1" }
    });
    expect(result).toBe(user);
  });

  it("busca un usuario por email", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { email: "admin@example.com" } as User;

    typeormRepository.findOne.mockResolvedValue(user);

    const repository = new UserRepository();
    Object.defineProperty(repository, "repository", {
      value: typeormRepository
    });

    const result = await repository.findByEmail("admin@example.com");

    expect(typeormRepository.findOne).toHaveBeenCalledWith({
      where: { email: "admin@example.com" }
    });
    expect(result).toBe(user);
  });

  it("guarda un usuario", async () => {
    const typeormRepository = createRepositoryMock();
    const user = { id: "user-1" } as User;

    typeormRepository.save.mockResolvedValue(user);

    const repository = new UserRepository();
    Object.defineProperty(repository, "repository", {
      value: typeormRepository
    });

    const result = await repository.save(user);

    expect(typeormRepository.save).toHaveBeenCalledWith(user);
    expect(result).toBe(user);
  });
});
