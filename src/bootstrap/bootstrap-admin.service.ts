import { EntityManager } from "typeorm";
import { ZodError } from "zod";
import { User } from "../database/entities/user.entity.js";
import { UserRepository } from "../modules/auth/user.repository.js";
import {
  emailSchema,
  normalizeEmail,
  passwordSchema
} from "../modules/auth/user.validation.js";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import { TenantSlugAlreadyExistsError } from "../modules/tenant/tenant.service.js";
import { validateCreateTenantInput } from "../modules/tenant/tenant.validation.js";
import {
  BootstrapAdminInput,
  BootstrapAdminResult
} from "./bootstrap-admin.types.js";

export class BootstrapConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapConfigError";
  }
}

export class AdminEmailAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe un usuario con ese email.");
    this.name = "AdminEmailAlreadyExistsError";
  }
}

export function normalizeAdminEmail(email: string): string {
  return normalizeEmail(email);
}

function toBootstrapConfigError(error: unknown): BootstrapConfigError {
  // El `message` de un ZodError es el volcado JSON de todos los issues, no un
  // texto para el operador: se toma el primer mensaje utile.
  if (error instanceof ZodError) {
    const [issue] = error.issues;

    return new BootstrapConfigError(
      issue?.message ?? "La configuración del bootstrap no es válida."
    );
  }

  return new BootstrapConfigError(
    error instanceof Error
      ? error.message
      : "La configuración del bootstrap no es válida."
  );
}

export function validateBootstrapAdminInput(input: BootstrapAdminInput): void {
  // Toda la validacion se reenvuelve en BootstrapConfigError para que el
  // comando distinga una configuracion invalida de un fallo de base de datos
  // sin tener que inspeccionar el tipo de la excepcion original.
  try {
    validateCreateTenantInput({
      name: input.businessName,
      slug: input.businessSlug,
      timezone: input.timezone,
      maxDailyAppointments: input.maxDailyAppointments,
      minimumBookingNoticeHours: input.minimumBookingNoticeHours
    });

    emailSchema.parse(input.adminEmail);
    passwordSchema.parse(input.adminPassword);
  } catch (error) {
    throw toBootstrapConfigError(error);
  }
}

// El alta de un negocio sin administrador deja el sistema sin ningun login
// posible, y un administrador sin negocio viola la FK de users. Por eso los
// repositorios llegan ya bound al EntityManager de la transaccion abierta por
// el comando: si el usuario falla, el negocio tampoco queda persistido.
export class BootstrapAdminService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly userRepository: UserRepository
  ) {}

  async run(input: BootstrapAdminInput): Promise<BootstrapAdminResult> {
    validateBootstrapAdminInput(input);

    const adminEmail = normalizeAdminEmail(input.adminEmail);

    const existingTenant = await this.tenantRepository.findBySlug(
      input.businessSlug
    );
    if (existingTenant) {
      throw new TenantSlugAlreadyExistsError();
    }

    const existingUser = await this.userRepository.findByEmail(adminEmail);
    if (existingUser) {
      throw new AdminEmailAlreadyExistsError();
    }

    const tenant = await this.tenantRepository.create(
      input.businessName.trim(),
      input.businessSlug,
      input.timezone,
      input.maxDailyAppointments,
      input.minimumBookingNoticeHours
    );

    const admin = await this.userRepository.create(
      adminEmail,
      input.adminPassword,
      tenant.id
    );

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      adminUserId: admin.id,
      adminEmail: admin.email
    };
  }
}

// Factory del caso de uso atado a una transaccion en curso. Si alguno de los
// dos repositorios se construjera con AppDataSource, la escritura del negocio
// se confirmaria fuera de la transaccion del administrador.
export function createBootstrapAdminService(
  manager: EntityManager
): BootstrapAdminService {
  return new BootstrapAdminService(
    new TenantRepository(manager),
    new UserRepository(manager.getRepository(User))
  );
}
