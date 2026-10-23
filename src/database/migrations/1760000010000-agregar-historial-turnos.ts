import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarHistorialTurnos1760000010000 implements MigrationInterface {
  name = "AgregarHistorialTurnos1760000010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "appointment_changes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "appointment_id" uuid NOT NULL,
        "actor_user_id" uuid NOT NULL,
        "action" varchar(20) NOT NULL,
        "reason" varchar(300),
        "previous_status" varchar(20) NOT NULL,
        "new_status" varchar(20) NOT NULL,
        "previous_start_at" timestamptz NOT NULL,
        "previous_end_at" timestamptz NOT NULL,
        "new_start_at" timestamptz NOT NULL,
        "new_end_at" timestamptz NOT NULL,
        "previous_professional_id" uuid NOT NULL,
        "new_professional_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointment_changes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_appointment_changes_appointment"
          FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_appointment_changes_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_appointment_changes_action"
          CHECK ("action" IN ('CANCELLED', 'RESCHEDULED'))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_appointment_changes_appointment" ON "appointment_changes" ("appointment_id", "created_at")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_appointment_changes_appointment"');
    await queryRunner.query('DROP TABLE "appointment_changes"');
  }
}
