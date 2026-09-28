import { randomBytes } from "node:crypto";
import { WebsiteIntegration } from "../../database/entities/website-integration.entity.js";
import { DnsTxtVerificationProvider, DomainVerificationProvider } from "./domain-verification.js";
import { WebsiteIntegrationRepository } from "./website-integration.repository.js";
import {
  CreateWebsiteIntegrationInput
} from "./website-integration.types.js";
import {
  normalizeDomain,
  validateCreateWebsiteIntegrationInput
} from "./website-integration.validation.js";

export class WebsiteIntegrationAlreadyExistsError extends Error {}
export class WebsiteIntegrationNotFoundError extends Error {}
export class WebsiteIntegrationNotVerifiedError extends Error {}
export class WebsiteIntegrationVerificationFailedError extends Error {}

export class WebsiteIntegrationService {
  constructor(
    private readonly repository = new WebsiteIntegrationRepository(),
    private readonly verificationProvider: DomainVerificationProvider =
      new DnsTxtVerificationProvider()
  ) {}

  async create(input: CreateWebsiteIntegrationInput): Promise<WebsiteIntegration> {
    validateCreateWebsiteIntegrationInput(input);

    const domain = normalizeDomain(input.domain);
    const existing = await this.repository.findByDomain(domain);

    if (existing) {
      throw new WebsiteIntegrationAlreadyExistsError(
        "Ya existe una integración para este dominio."
      );
    }

    const publicKey = this.generatePublicKey();
    const verificationToken = this.generateVerificationToken();

    return this.repository.create(
      input.tenantId,
      domain,
      publicKey,
      verificationToken,
      input.integrationProvider ?? "CUSTOM"
    );
  }

  list(tenantId: string) {
    return this.repository.findAllByTenant(tenantId);
  }

  async getById(id: string, tenantId: string): Promise<WebsiteIntegration> {
    const integration = await this.repository.findById(id, tenantId);

    if (!integration) {
      throw new WebsiteIntegrationNotFoundError(
        "La integración del sitio no existe."
      );
    }

    return integration;
  }

  async verify(id: string, tenantId: string): Promise<WebsiteIntegration> {
    const integration = await this.getById(id, tenantId);

    if (integration.verificationStatus === "VERIFIED") {
      return integration;
    }

    const verified = await this.verificationProvider.verify(
      integration.domain,
      integration.verificationToken
    );

    if (!verified) {
      const failed = await this.repository.markVerificationFailed(id, tenantId);

      if (!failed) {
        throw new WebsiteIntegrationNotFoundError(
          "La integración del sitio no existe."
        );
      }

      throw new WebsiteIntegrationVerificationFailedError(
        "No se encontró el token de verificación DNS esperado."
      );
    }

    const verifiedIntegration = await this.repository.markVerified(id, tenantId);

    if (!verifiedIntegration) {
      throw new WebsiteIntegrationNotFoundError(
        "La integración del sitio no existe."
      );
    }

    return verifiedIntegration;
  }

  async connect(id: string, tenantId: string): Promise<WebsiteIntegration> {
    const integration = await this.getById(id, tenantId);

    if (integration.verificationStatus !== "VERIFIED") {
      throw new WebsiteIntegrationNotVerifiedError(
        "El dominio debe estar verificado antes de conectar la integración."
      );
    }

    const connected = await this.repository.connect(id, tenantId);

    if (!connected) {
      throw new WebsiteIntegrationNotFoundError(
        "La integración del sitio no existe."
      );
    }

    return connected;
  }

  private generatePublicKey(): string {
    return `pk_live_${randomBytes(24).toString("base64url")}`;
  }

  private generateVerificationToken(): string {
    return `turnos-verification=${randomBytes(32).toString("base64url")}`;
  }
}
