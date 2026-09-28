import { Tenant } from "../../database/entities/tenant.entity.js";
import { TenantRepository } from "./tenant.repository.js";
import {
  validateCreateTenantInput,
  validateUpdateTenantInput
} from "./tenant.validation.js";
import { CreateTenantInput, UpdateTenantInput } from "./tenant.types.js";

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
}
