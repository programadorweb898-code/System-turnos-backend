import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarBloqueoPorProfesional1760000008000 implements MigrationInterface {
  name = "AgregarBloqueoPorProfesional1760000008000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "blocked_times" ADD "professional_id" uuid');
    await queryRunner.query('ALTER TABLE "blocked_times" ADD CONSTRAINT "FK_blocked_times_professional" FOREIGN KEY ("professional_id") REFERENCES "employees" ("id")');
    await queryRunner.query('CREATE INDEX "IDX_blocked_times_professional_id" ON "blocked_times" ("professional_id")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_blocked_times_professional_id"');
    await queryRunner.query('ALTER TABLE "blocked_times" DROP CONSTRAINT "FK_blocked_times_professional"');
    await queryRunner.query('ALTER TABLE "blocked_times" DROP COLUMN "professional_id"');
  }
}
