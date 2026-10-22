import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearProfessionalServices1760000004000 implements MigrationInterface {
  name = "CrearProfessionalServices1760000004000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "professional_services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        CONSTRAINT "PK_professional_services_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_professional_services_professional_service"
          UNIQUE ("professional_id", "service_id"),
        CONSTRAINT "FK_professional_services_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_professional_services_professional"
          FOREIGN KEY ("professional_id") REFERENCES "employees" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_professional_services_service"
          FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_professional_services_tenant_id" ON "professional_services" ("tenant_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_professional_services_professional_id" ON "professional_services" ("professional_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_professional_services_service_id" ON "professional_services" ("service_id")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_professional_services_service_id"');
    await queryRunner.query('DROP INDEX "IDX_professional_services_professional_id"');
    await queryRunner.query('DROP INDEX "IDX_professional_services_tenant_id"');
    await queryRunner.query('DROP TABLE "professional_services"');
  }
}
