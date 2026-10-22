import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearUsuarios1760000003000 implements MigrationInterface {
  name = "CrearUsuarios1760000003000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'ADMIN',
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "tenant_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CK_users_role" CHECK ("role" IN ('ADMIN')),
        CONSTRAINT "CK_users_status" CHECK ("status" IN ('ACTIVE', 'DISABLED')),
        CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query('CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_users_tenant_id"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
