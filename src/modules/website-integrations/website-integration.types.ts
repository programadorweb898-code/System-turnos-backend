import {
  WebsiteIntegrationProvider
} from "../../database/entities/website-integration.entity.js";

export interface CreateWebsiteIntegrationInput {
  tenantId: string;
  domain: string;
  integrationProvider?: WebsiteIntegrationProvider;
}

export interface WebsiteIntegrationSummary {
  id: string;
  tenantId: string;
  domain: string;
  publicKey: string;
  verificationStatus: string;
  verificationMethod: string | null;
  integrationProvider: string;
  integrationStatus: string;
  verifiedAt: Date | null;
  connectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
