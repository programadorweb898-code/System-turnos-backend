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

  async create(
    name: string,
    slug: string,
    timezone: string,
    maxDailyAppointments = 20,
    minimumBookingNoticeMinutes = 0
  ): Promise<Tenant> {
    const tenant = this.repository.create({
      name,
      slug,
      timezone,
      maxDailyAppointments,
      minimumBookingNoticeMinutes,
      status: "draft"
    });
    return this.repository.save(tenant);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    return this.repository.save(tenant);
  }
}
