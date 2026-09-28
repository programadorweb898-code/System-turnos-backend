import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

export const WEBSITE_VERIFICATION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "FAILED"
] as const;

export type WebsiteVerificationStatus =
  (typeof WEBSITE_VERIFICATION_STATUSES)[number];

export const WEBSITE_VERIFICATION_METHODS = [
  "DNS",
  "FILE",
  "META_TAG"
] as const;

export type WebsiteVerificationMethod =
  (typeof WEBSITE_VERIFICATION_METHODS)[number];

export const WEBSITE_INTEGRATION_PROVIDERS = [
  "CUSTOM",
  "WORDPRESS",
  "WIX"
] as const;

export type WebsiteIntegrationProvider =
  (typeof WEBSITE_INTEGRATION_PROVIDERS)[number];

export const WEBSITE_INTEGRATION_STATUSES = [
  "NOT_CONFIGURED",
  "PENDING",
  "CONNECTED",
  "ERROR",
  "DISCONNECTED"
] as const;

export type WebsiteIntegrationStatus =
  (typeof WEBSITE_INTEGRATION_STATUSES)[number];

@Entity({ name: "website_integrations" })
export class WebsiteIntegration {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "tenant_id", type: "uuid" })
  tenantId!: string;

  @Column({ unique: true, length: 255 })
  domain!: string;

  @Column({ name: "public_key", unique: true, length: 100 })
  publicKey!: string;

  @Column({ name: "verification_token", length: 128 })
  verificationToken!: string;

  @Column({ name: "verification_status", length: 20, default: "PENDING" })
  verificationStatus!: WebsiteVerificationStatus;

  @Column({ name: "verification_method", length: 20, nullable: true })
  verificationMethod!: WebsiteVerificationMethod | null;

  @Column({ name: "integration_provider", length: 20, default: "CUSTOM" })
  integrationProvider!: WebsiteIntegrationProvider;

  @Column({ name: "integration_status", length: 20, default: "NOT_CONFIGURED" })
  integrationStatus!: WebsiteIntegrationStatus;

  @Column({ name: "verified_at", type: "timestamptz", nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: "connected_at", type: "timestamptz", nullable: true })
  connectedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
