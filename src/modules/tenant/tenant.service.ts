import { Tenant } from "../../database/entities/tenant.entity.js";
import { TenantRepository } from "./tenant.repository.js";
import {
  validateCreateTenantInput,
  validateUpdateTenantInput
} from "./tenant.validation.js";
import { CreateTenantInput, UpdateTenantInput } from "./tenant.types.js";

export class TenantService {
  constructor(private readonly tenantRepository = new TenantRepository()) {}

  async create(input: CreateTenantInput): Promise<Tenant> {
    validateCreateTenantInput(input);

    const existing = await this.tenantRepository.findBySlug(input.slug);
    if (existing) {
      throw new Error("Ya existe un negocio con ese slug.");
    }

    return this.tenantRepository.create(
      input.name.trim(),
      input.slug,
      input.timezone
    );
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    validateUpdateTenantInput(input);

    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new Error("El negocio no existe.");
    }

    if (input.slug && input.slug !== tenant.slug) {
      const existing = await this.tenantRepository.findBySlug(input.slug);
      if (existing) {
        throw new Error("Ya existe un negocio con ese slug.");
      }
    }

    Object.assign(tenant, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {})
    });

    return this.tenantRepository.update(tenant);
  }
}
