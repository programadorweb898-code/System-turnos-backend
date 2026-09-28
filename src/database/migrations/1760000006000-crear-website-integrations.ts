import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearWebsiteIntegrations1760000006000 implements MigrationInterface {
  name = "CrearWebsiteIntegrations1760000006000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "website_integrations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "domain" character varying(255) NOT NULL,
        "public_key" character varying(100) NOT NULL,
        "verification_status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "verification_method" character varying(20),
        "integration_provider" character varying(20) NOT NULL DEFAULT 'CUSTOM',
        "integration_status" character varying(20) NOT NULL DEFAULT 'NOT_CONFIGURED',
        "verified_at" TIMESTAMPTZ,
        "connected_at" TIMESTAMPTZ,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_website_integrations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_website_integrations_domain" UNIQUE ("domain"),
        CONSTRAINT "UQ_website_integrations_public_key" UNIQUE ("public_key"),
        CONSTRAINT "CK_website_integrations_verification_status"
          CHECK ("verification_status" IN ('PENDING', 'VERIFIED', 'FAILED')),
        CONSTRAINT "CK_website_integrations_verification_method"
          CHECK (
            "verification_method" IS NULL OR
            "verification_method" IN ('DNS', 'FILE', 'META_TAG')
          ),
        CONSTRAINT "CK_website_integrations_provider"
          CHECK ("integration_provider" IN ('CUSTOM', 'WORDPRESS', 'WIX')),
        CONSTRAINT "CK_website_integrations_status"
          CHECK (
            "integration_status" IN (
              'NOT_CONFIGURED',
              'PENDING',
              'CONNECTED',
              'ERROR',
              'DISCONNECTED'
            )
          ),
        CONSTRAINT "FK_website_integrations_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_website_integrations_tenant_id"
      ON "website_integrations" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "website_integration_origins" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "website_integration_id" uuid NOT NULL,
        "origin" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_website_integration_origins_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_website_integration_origins_integration_origin"
          UNIQUE ("website_integration_id", "origin"),
        CONSTRAINT "FK_website_integration_origins_integration"
          FOREIGN KEY ("website_integration_id")
          REFERENCES "website_integrations" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_website_integration_origins_integration_id"
      ON "website_integration_origins" ("website_integration_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_website_integration_origins_integration_id"'
    );
    await queryRunner.query('DROP TABLE "website_integration_origins"');
    await queryRunner.query('DROP INDEX "IDX_website_integrations_tenant_id"');
    await queryRunner.query('DROP TABLE "website_integrations"');
  }
}
