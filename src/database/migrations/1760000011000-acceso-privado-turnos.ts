import { MigrationInterface, QueryRunner } from "typeorm";

export class AccesoPrivadoTurnos1760000011000 implements MigrationInterface {
  name = "AccesoPrivadoTurnos1760000011000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE appointment_access_tokens (
        appointment_id uuid PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
        token_hash char(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IDX_appointment_access_tokens_tenant ON appointment_access_tokens (tenant_id, appointment_id)"
    );
    await queryRunner.query("ALTER TABLE appointment_changes ALTER COLUMN actor_user_id DROP NOT NULL");
    await queryRunner.query(
      "ALTER TABLE appointment_changes ADD COLUMN actor_type varchar(10) NOT NULL DEFAULT 'ADMIN'"
    );
    await queryRunner.query(
      "ALTER TABLE appointment_changes ADD CONSTRAINT CK_appointment_changes_actor_type CHECK (actor_type IN ('ADMIN', 'CLIENT'))"
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE appointment_changes DROP CONSTRAINT CK_appointment_changes_actor_type"
    );
    await queryRunner.query("ALTER TABLE appointment_changes DROP COLUMN actor_type");
    await queryRunner.query("ALTER TABLE appointment_changes ALTER COLUMN actor_user_id SET NOT NULL");
    await queryRunner.query("DROP INDEX IDX_appointment_access_tokens_tenant");
    await queryRunner.query("DROP TABLE appointment_access_tokens");
  }
}
