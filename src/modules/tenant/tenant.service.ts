import { Tenant } from "../../database/entities/tenant.entity.js";
import { TenantRepository } from "./tenant.repository.js";
import {
  validateCreateTenantInput,
  validateUpdateTenantInput
} from "./tenant.validation.js";
import {
  CreateTenantInput,
  MISSING_PUBLICATION_REQUIREMENTS,
  UpdateTenantInput
} from "./tenant.types.js";

export class TenantNotFoundError extends Error {
  constructor() {
    super("El negocio no existe.");
    this.name = "TenantNotFoundError";
  }
}

export class TenantSlugAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe un negocio con ese slug.");
    this.name = "TenantSlugAlreadyExistsError";
  }
}

export class TenantNotReadyError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super("El negocio todavía no está listo para publicarse.");
    this.name = "TenantNotReadyError";
    this.details = details;
  }
}

export class TenantService {
  constructor(private readonly tenantRepository = new TenantRepository()) {}

  async create(input: CreateTenantInput): Promise<Tenant> {
    validateCreateTenantInput(input);

    const existing = await this.tenantRepository.findBySlug(input.slug);
    if (existing) {
      throw new TenantSlugAlreadyExistsError();
    }

    return this.tenantRepository.create(
      input.name.trim(),
      input.slug,
      input.timezone,
      input.maxDailyAppointments,
      input.minimumBookingNoticeHours
    );
  }

  async getById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);

    if (!tenant) {
      throw new TenantNotFoundError();
    }

    return tenant;
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    validateUpdateTenantInput(input);

    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new TenantNotFoundError();
    }

    if (input.slug && input.slug !== tenant.slug) {
      const existing = await this.tenantRepository.findBySlug(input.slug);
      if (existing) {
        throw new TenantSlugAlreadyExistsError();
      }
    }

    Object.assign(tenant, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.maxDailyAppointments !== undefined
        ? { maxDailyAppointments: input.maxDailyAppointments }
        : {}),
      ...(input.minimumBookingNoticeHours !== undefined
        ? { minimumBookingNoticeHours: input.minimumBookingNoticeHours }
        : {})
    });

    return this.tenantRepository.update(tenant);
  }

  async publish(id: string): Promise<Tenant> {
    const tenant = await this.getById(id);
    const requirements = await this.tenantRepository.findPublicationRequirements(tenant);

    const missing = MISSING_PUBLICATION_REQUIREMENTS.filter(
      (requirement) => !requirements[requirement.key]
    ).map((requirement) => requirement.message);

    if (missing.length > 0) {
      throw new TenantNotReadyError(missing);
    }

    if (tenant.status === "published") {
      return tenant;
    }

    await this.tenantRepository.updateStatus(tenant.id, "published");

    return this.tenantRepository.findById(tenant.id).then((updated) => updated ?? tenant);
  }

  async unpublish(id: string): Promise<Tenant> {
    const tenant = await this.getById(id);

    if (tenant.status === "unpublished") {
      return tenant;
    }

    await this.tenantRepository.updateStatus(tenant.id, "unpublished");

    return this.tenantRepository.findById(tenant.id).then((updated) => updated ?? tenant);
  }
}
