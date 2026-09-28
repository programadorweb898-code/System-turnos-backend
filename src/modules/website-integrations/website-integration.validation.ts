import { z } from "zod";
import { WebsiteIntegrationProvider } from "../../database/entities/website-integration.entity.js";
import { CreateWebsiteIntegrationInput } from "./website-integration.types.js";

const uuidSchema = z.string().uuid();

const domainSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (value) => !value.includes("://") && !value.includes("/") && !value.includes(" "),
    "El dominio debe contener únicamente el hostname."
  );

const providerSchema = z.enum(["CUSTOM", "WORDPRESS", "WIX"]);

const createWebsiteIntegrationRequestSchema = z.object({
  domain: domainSchema,
  integrationProvider: providerSchema.optional()
});

const createWebsiteIntegrationInputSchema = z.object({
  tenantId: uuidSchema,
  domain: domainSchema,
  integrationProvider: providerSchema.optional()
});

export function validateCreateWebsiteIntegrationInput(
  input: CreateWebsiteIntegrationInput
): void {
  createWebsiteIntegrationInputSchema.parse(input);
}

export function parseCreateWebsiteIntegrationRequest(input: unknown): {
  domain: string;
  integrationProvider?: WebsiteIntegrationProvider;
} {
  return createWebsiteIntegrationRequestSchema.parse(input);
}

export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

export function normalizeOrigin(domain: string): string {
  return `https://${domain}`;
}
