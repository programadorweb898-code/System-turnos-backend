import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearAppointments1760000005000 implements MigrationInterface {
  name = "CrearAppointments1760000005000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "btree_gist"');

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "customer_name" character varying(120) NOT NULL,
        "customer_phone" character varying(40) NOT NULL,
        "customer_notes" character varying(300),
        "service_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "start_at" TIMESTAMPTZ NOT NULL,
        "end_at" TIMESTAMPTZ NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_appointments_status"
          CHECK ("status" IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
        CONSTRAINT "CK_appointments_interval"
          CHECK ("start_at" < "end_at"),
        CONSTRAINT "FK_appointments_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_appointments_service"
          FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_appointments_professional"
          FOREIGN KEY ("professional_id") REFERENCES "employees" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_appointments_tenant_id" ON "appointments" ("tenant_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_appointments_service_id" ON "appointments" ("service_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_appointments_professional_id" ON "appointments" ("professional_id")'
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_appointments_start_at" ON "appointments" ("start_at")'
    );

    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "EXCL_appointments_professional_time"
      EXCLUDE USING gist (
        "professional_id" WITH =,
        tstzrange("start_at", "end_at", '[)') WITH &&
      )
      WHERE ("status" IN ('PENDING', 'CONFIRMED'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "appointments" DROP CONSTRAINT "EXCL_appointments_professional_time"'
    );
    await queryRunner.query('DROP INDEX "IDX_appointments_start_at"');
    await queryRunner.query('DROP INDEX "IDX_appointments_professional_id"');
    await queryRunner.query('DROP INDEX "IDX_appointments_service_id"');
    await queryRunner.query('DROP INDEX "IDX_appointments_tenant_id"');
    await queryRunner.query('DROP TABLE "appointments"');
    await queryRunner.query('DROP EXTENSION IF EXISTS "btree_gist"');
  }
}
