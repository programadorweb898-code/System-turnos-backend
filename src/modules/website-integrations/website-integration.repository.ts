import { DataSource } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { WebsiteIntegration } from "../../database/entities/website-integration.entity.js";
import { WebsiteIntegrationOrigin } from "../../database/entities/website-integration-origin.entity.js";

export class WebsiteIntegrationRepository {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  findById(id: string, tenantId: string) {
    return this.dataSource.getRepository(WebsiteIntegration).findOne({
      where: { id, tenantId }
    });
  }

  findByDomain(domain: string) {
    return this.dataSource.getRepository(WebsiteIntegration).findOne({
      where: { domain }
    });
  }

  findAllByTenant(tenantId: string) {
    return this.dataSource.getRepository(WebsiteIntegration).find({
      where: { tenantId },
      order: { createdAt: "DESC" }
    });
  }

  async create(
    tenantId: string,
    domain: string,
    publicKey: string,
    integrationProvider: WebsiteIntegration["integrationProvider"]
  ) {
    return this.dataSource.transaction(async (manager) => {
      const integration = manager.getRepository(WebsiteIntegration).create({
        tenantId,
        domain,
        publicKey,
        integrationProvider,
        verificationStatus: "PENDING",
        integrationStatus: "NOT_CONFIGURED"
      });

      const savedIntegration = await manager
        .getRepository(WebsiteIntegration)
        .save(integration);

      const origin = manager.getRepository(WebsiteIntegrationOrigin).create({
        websiteIntegrationId: savedIntegration.id,
        origin: `https://${domain}`
      });

      await manager.getRepository(WebsiteIntegrationOrigin).save(origin);

      return savedIntegration;
    });
  }

  async connect(id: string, tenantId: string) {
    const repository = this.dataSource.getRepository(WebsiteIntegration);
    const integration = await repository.findOne({
      where: { id, tenantId }
    });

    if (!integration) return null;

    integration.integrationStatus = "CONNECTED";
    integration.connectedAt = new Date();

    return repository.save(integration);
  }
}
