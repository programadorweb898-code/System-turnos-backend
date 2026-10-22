import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarReglasReservaTenant1760000001000 implements MigrationInterface {
  name = "AgregarReglasReservaTenant1760000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN "max_daily_appointments" integer NOT NULL DEFAULT 20,
      ADD COLUMN "minimum_booking_notice_minutes" integer NOT NULL DEFAULT 0,
      ADD CONSTRAINT "CK_tenants_max_daily_appointments"
        CHECK ("max_daily_appointments" >= 0),
      ADD CONSTRAINT "CK_tenants_minimum_booking_notice"
        CHECK ("minimum_booking_notice_minutes" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      DROP CONSTRAINT "CK_tenants_minimum_booking_notice",
      DROP CONSTRAINT "CK_tenants_max_daily_appointments",
      DROP COLUMN "minimum_booking_notice_minutes",
      DROP COLUMN "max_daily_appointments"
    `);
  }
}
