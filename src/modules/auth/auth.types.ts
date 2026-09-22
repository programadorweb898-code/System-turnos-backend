export const USER_ROLES = ["ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

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
