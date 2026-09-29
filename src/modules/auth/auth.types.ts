import { UserRole } from "./auth.constants.js";

// El rol no se acepta en el alta: la unica columna de rol que admite la base es
// ADMIN, asi que ofrecerlo seria una opcion que el servidor ignora.
export interface CreateUserInput {
  email: string;
  password: string;
  tenantId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  role: UserRole;
}

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}
