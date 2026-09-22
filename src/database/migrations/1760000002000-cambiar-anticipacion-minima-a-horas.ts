import { MigrationInterface, QueryRunner } from "typeorm";

export class CambiarAnticipacionMinimaAHoras1760000002000 implements MigrationInterface {
  name = "CambiarAnticipacionMinimaAHoras1760000002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      RENAME COLUMN "minimum_booking_notice_minutes"
      TO "minimum_booking_notice_hours"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenants"
      RENAME CONSTRAINT "CK_tenants_minimum_booking_notice"
      TO "CK_tenants_minimum_booking_notice_hours"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      RENAME CONSTRAINT "CK_tenants_minimum_booking_notice_hours"
      TO "CK_tenants_minimum_booking_notice"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenants"
      RENAME COLUMN "minimum_booking_notice_hours"
      TO "minimum_booking_notice_minutes"
    `);
  }
}
