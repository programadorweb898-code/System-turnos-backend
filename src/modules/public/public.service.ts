import { PublicRepository } from "./public.repository.js";

export class PublicSiteNotFoundError extends Error {}

export class PublicService {
  constructor(private readonly repository = new PublicRepository()) {}

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
}
