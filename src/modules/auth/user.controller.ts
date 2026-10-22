import { Request, Response } from "express";
import {
  InvalidUserInputError,
  UserEmailAlreadyExistsError,
  UserService
} from "./user.service.js";
import { createUserRequestSchema } from "./user.validation.js";

export class UserController {
  constructor(private readonly userService = new UserService()) {}

  createAdmin = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.authenticatedUser?.tenantId;

    if (!tenantId) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Se requiere autenticación."
        }
      });
      return;
    }

    const result = createUserRequestSchema.safeParse(req.body ?? {});

    if (!result.success) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Los datos del usuario no son válidos."
        }
      });
      return;
    }

    try {
      // El tenantId se toma del token y se pisa sobre el body a proposito:
      // ningun campo de la solicitud puede decidir en que negocio se crea.
      const user = await this.userService.createAdmin({
        ...result.data,
        tenantId
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      });
    } catch (error) {
      if (error instanceof InvalidUserInputError) {
        res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: error.message
          }
        });
        return;
      }

      if (error instanceof UserEmailAlreadyExistsError) {
        res.status(409).json({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: error.message
          }
        });
        return;
      }

      throw error;
    }
  };
}
