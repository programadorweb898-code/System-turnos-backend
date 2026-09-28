import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarWebsiteVerificationToken1760000007000 implements MigrationInterface {
  name = "AgregarWebsiteVerificationToken1760000007000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "website_integrations" ADD "verification_token" character varying(128)'
    );

    await queryRunner.query(
      'UPDATE "website_integrations" SET "verification_token" = CONCAT(\'turnos-verification=\', encode(gen_random_bytes(32), \'base64\')) WHERE "verification_token" IS NULL'
    );

    await queryRunner.query(
      'ALTER TABLE "website_integrations" ALTER COLUMN "verification_token" SET NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "website_integrations" DROP COLUMN "verification_token"'
    );
  }
}
