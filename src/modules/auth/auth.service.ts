import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { UserRepository } from "./user.repository.js";
import { AuthenticatedUser, LoginInput, LoginResult } from "./auth.types.js";

const JWT_EXPIRES_IN = "4h";

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly jwtSecret = env.jwtSecret
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Credenciales inválidas");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("Usuario deshabilitado");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new Error("Credenciales inválidas");
    }

    if (!this.jwtSecret) {
      throw new Error("JWT_SECRET no está configurado");
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role
    };

    const accessToken = jwt.sign(
      { sub: user.id },
      this.jwtSecret,
      { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" }
    );

    return {
      accessToken,
      user: authenticatedUser
    };
  }
}
