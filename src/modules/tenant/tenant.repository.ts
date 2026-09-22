import { Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Tenant } from "../../database/entities/tenant.entity.js";

export class TenantRepository {
  private readonly repository: Repository<Tenant>;

  constructor() {
    this.repository = AppDataSource.getRepository(Tenant);
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async create(name: string, slug: string, timezone: string): Promise<Tenant> {
    const tenant = this.repository.create({ name, slug, timezone, status: "draft" });
    return this.repository.save(tenant);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    return this.repository.save(tenant);
  }
}
