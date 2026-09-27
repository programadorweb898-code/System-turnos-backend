import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Email y contraseña son obligatorios"
        }
      });
      return;
    }

    try {
      const result = await this.authService.login({ email, password });

      res.status(200).json(result);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Usuario deshabilitado"
      ) {
        res.status(403).json({
          error: {
            code: "USER_DISABLED",
            message: error.message
          }
        });
        return;
      }

      res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Credenciales inválidas"
        }
      });
    }
  };
}
