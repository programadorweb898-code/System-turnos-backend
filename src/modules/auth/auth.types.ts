import { UserRole } from "./auth.constants.js";

export interface CreateUserInput {
  email: string;
  password: string;
  tenantId: string;
  role?: UserRole;
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
