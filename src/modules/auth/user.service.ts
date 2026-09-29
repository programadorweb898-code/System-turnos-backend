import { User } from "../../database/entities/user.entity.js";
import { CreateUserInput } from "./auth.types.js";
import { UserRepository } from "./user.repository.js";
import { createUserInputSchema } from "./user.validation.js";

export class InvalidUserInputError extends Error {
  constructor() {
    super("Los datos del usuario no son válidos.");
    this.name = "InvalidUserInputError";
  }
}

export class UserEmailAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe un usuario con ese email.");
    this.name = "UserEmailAlreadyExistsError";
  }
}

// El tenantId lo resuelve siempre el llamador desde el token, nunca desde el
// cuerpo de la solicitud: si se aceptara del body, un administrador podria
// crear usuarios dentro de otro negocio.
export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async createAdmin(input: CreateUserInput): Promise<User> {
    const result = createUserInputSchema.safeParse(input);

    if (!result.success) {
      throw new InvalidUserInputError();
    }

    const existing = await this.userRepository.findByEmail(result.data.email);

    if (existing) {
      throw new UserEmailAlreadyExistsError();
    }

    return this.userRepository.create(
      result.data.email,
      result.data.password,
      result.data.tenantId
    );
  }
}
