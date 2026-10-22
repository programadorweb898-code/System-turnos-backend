import { MigrationInterface, QueryRunner } from "typeorm";

export class InicialConfiguracion1760000000000 implements MigrationInterface {
  name = "InicialConfiguracion1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "slug" varchar(80) NOT NULL,
        "timezone" varchar(100) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"),
        CONSTRAINT "CK_tenants_status" CHECK ("status" IN ('draft', 'published', 'unpublished'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "description" text,
        "duration" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_services_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_services_duration" CHECK ("duration" > 0),
        CONSTRAINT "CK_services_status" CHECK ("status" IN ('active', 'inactive')),
        CONSTRAINT "FK_services_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employees_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_employees_status" CHECK ("status" IN ('active', 'inactive')),
        CONSTRAINT "FK_employees_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "business_hours" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "day_of_week" smallint NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_hours_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_business_hours_day" CHECK ("day_of_week" BETWEEN 0 AND 6),
        CONSTRAINT "CK_business_hours_range" CHECK ("start_time" < "end_time"),
        CONSTRAINT "FK_business_hours_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "blocked_times" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blocked_times_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_blocked_times_range" CHECK ("starts_at" < "ends_at"),
        CONSTRAINT "FK_blocked_times_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
      )
    `);

    await queryRunner.query('CREATE INDEX "IDX_services_tenant_id" ON "services" ("tenant_id")');
    await queryRunner.query('CREATE INDEX "IDX_employees_tenant_id" ON "employees" ("tenant_id")');
    await queryRunner.query('CREATE INDEX "IDX_business_hours_tenant_id" ON "business_hours" ("tenant_id")');
    await queryRunner.query('CREATE INDEX "IDX_blocked_times_tenant_id" ON "blocked_times" ("tenant_id")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "blocked_times"');
    await queryRunner.query('DROP TABLE "business_hours"');
    await queryRunner.query('DROP TABLE "employees"');
    await queryRunner.query('DROP TABLE "services"');
    await queryRunner.query('DROP TABLE "tenants"');
  }
}
