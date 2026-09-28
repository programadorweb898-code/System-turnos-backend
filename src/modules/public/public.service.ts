import { AvailabilityService } from "../availability/availability.service.js";
import { parseAvailabilityRequest } from "../availability/availability.validation.js";
import { PublicRepository } from "./public.repository.js";

export class PublicSiteNotFoundError extends Error {}

export class PublicService {
  constructor(
    private readonly repository = new PublicRepository(),
    private readonly availabilityService = new AvailabilityService()
  ) {}

  async getSite(publicKey: string) {
    const site = await this.repository.findPublishedSiteByPublicKey(publicKey);

    if (!site) {
      throw new PublicSiteNotFoundError(
        "El sitio no está disponible para reservas."
      );
    }

    return site;
  }

  async listServices(publicKey: string) {
    const site = await this.getSite(publicKey);
    return this.repository.findActiveServicesByTenant(site.tenant_id);
  }

  async getAvailability(publicKey: string, input: unknown) {
    const site = await this.getSite(publicKey);
    const parsed = parseAvailabilityRequest(input);

    return this.availabilityService.getAvailability({
      tenantId: site.tenant_id,
      ...parsed
    });
  }
}
