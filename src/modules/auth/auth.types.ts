import { UserRole } from "./auth.constants.js";

export interface CreateUserInput {
  email: string;
  password: string;
  tenantId: string;
  role?: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  role: UserRole;
}
