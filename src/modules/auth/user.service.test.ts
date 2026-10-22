import { User } from "../../database/entities/user.entity.js";
import { CreateUserInput } from "./auth.types.js";
import { UserRepository } from "./user.repository.js";
import {
  InvalidUserInputError,
  UserEmailAlreadyExistsError,
  UserService
} from "./user.service.js";

describe("UserService", () => {
  const validInput: CreateUserInput = {
    email: "Admin@Peluqueria-Luis.TEST",
    password: "una-clave-larga-1",
    tenantId: "tenant-1"
  };

  function createUserRepositoryMock() {
    return {
      findByEmail: jest.fn(),
      create: jest.fn()
    } as unknown as jest.Mocked<UserRepository>;
  }

  it("crea el administrador con el email normalizado", async () => {
    const userRepository = createUserRepositoryMock();
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({ id: "user-1" } as User);

    await new UserService(userRepository).createAdmin(validInput);

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      "admin@peluqueria-luis.test"
    );
    expect(userRepository.create).toHaveBeenCalledWith(
      "admin@peluqueria-luis.test",
      validInput.password,
      validInput.tenantId
    );
  });

  it("rechaza un email que ya existe", async () => {
    const userRepository = createUserRepositoryMock();
    userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "admin@peluqueria-luis.test"
    } as User);

    await expect(
      new UserService(userRepository).createAdmin(validInput)
    ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    ["email inválido", { email: "no-es-un-email" }],
    ["email ausente", { email: undefined }],
    ["contraseña corta", { password: "corta" }],
    ["contraseña demasiado larga para bcrypt", { password: "a".repeat(73) }],
    ["tenant ausente", { tenantId: "" }]
  ])("rechaza el alta con %s", async (_case, overrides) => {
    const userRepository = createUserRepositoryMock();

    await expect(
      new UserService(userRepository).createAdmin({
        ...validInput,
        ...overrides
      } as unknown as CreateUserInput)
    ).rejects.toBeInstanceOf(InvalidUserInputError);

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
