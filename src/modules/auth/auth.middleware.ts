import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { UserRepository } from "./user.repository.js";
import { AuthenticatedUser } from "./auth.types.js";
import { USER_ROLES, UserRole } from "./auth.constants.js";
import { JWT_AUDIENCE, JWT_ISSUER } from "./auth.service.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

export const requireAuthentication = (
  userRepository = new UserRepository()
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!env.jwtSecret) {
      res.status(500).json({
        error: {
          code: "AUTH_CONFIGURATION_ERROR",
          message: "La autenticación no está configurada"
        }
      });
      return;
    }

    const authorization = req.header("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Token de autenticación requerido"
        }
      });
      return;
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Token de autenticación requerido"
        }
      });
      return;
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret, {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      });

      if (
        typeof payload === "string" ||
        typeof payload.sub !== "string" ||
        !payload.sub
      ) {
        res.status(401).json({
          error: {
            code: "INVALID_TOKEN",
            message: "Token inválido"
          }
        });
        return;
      }

      const user = await userRepository.findById(payload.sub);

      if (!user) {
        res.status(401).json({
          error: {
            code: "INVALID_TOKEN",
            message: "Token inválido"
          }
        });
        return;
      }

      if (user.status !== "ACTIVE") {
        res.status(403).json({
          error: {
            code: "USER_DISABLED",
            message: "Usuario deshabilitado"
          }
        });
        return;
      }

      if (!USER_ROLES.includes(user.role as UserRole)) {
        res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Rol no autorizado"
          }
        });
        return;
      }

      req.authenticatedUser = {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role
      };

      next();
    } catch {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Token inválido"
        }
      });
    }
  };
};
