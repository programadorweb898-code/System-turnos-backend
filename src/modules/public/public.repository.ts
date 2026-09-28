import { DataSource } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Service } from "../../database/entities/service.entity.js";
import { Tenant } from "../../database/entities/tenant.entity.js";
import { WebsiteIntegration } from "../../database/entities/website-integration.entity.js";

export class PublicRepository {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async findPublishedSiteByPublicKey(publicKey: string) {
    return this.dataSource
      .getRepository(WebsiteIntegration)
      .createQueryBuilder("integration")
      .innerJoin(
        Tenant,
        "tenant",
        "tenant.id = integration.tenant_id"
      )
      .select([
        "integration.id AS integration_id",
        "integration.tenant_id AS tenant_id",
        "integration.public_key AS public_key",
        "integration.integration_status AS integration_status",
        "tenant.name AS tenant_name",
        "tenant.slug AS tenant_slug",
        "tenant.timezone AS tenant_timezone",
        "tenant.status AS tenant_status"
      ])
      .where("integration.public_key = :publicKey", { publicKey })
      .andWhere("integration.verification_status = 'VERIFIED'")
      .andWhere("integration.integration_status = 'CONNECTED'")
      .andWhere("tenant.status = 'published'")
      .getRawOne<{
        integration_id: string;
        tenant_id: string;
        public_key: string;
        integration_status: string;
        tenant_name: string;
        tenant_slug: string;
        tenant_timezone: string;
        tenant_status: string;
      }>();
  }

  findActiveServicesByTenant(tenantId: string): Promise<Service[]> {
    return this.dataSource.getRepository(Service).find({
      where: { tenantId, status: "active" },
      order: { name: "ASC" }
    });
  }
}
