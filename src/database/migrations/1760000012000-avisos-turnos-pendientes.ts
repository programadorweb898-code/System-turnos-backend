import { MigrationInterface, QueryRunner } from "typeorm";

export class AvisosTurnosPendientes1760000012000 implements MigrationInterface {
  name = "AvisosTurnosPendientes1760000012000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE appointment_notification_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
        appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
        event_type varchar(30) NOT NULL
          CHECK (event_type IN ('appointment.created', 'appointment.cancelled', 'appointment.rescheduled')),
        payload jsonb NOT NULL,
        status varchar(12) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'sent', 'failed')),
        attempts integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_error varchar(500),
        sent_at timestamptz
      )
    `);
    await queryRunner.query(
      "CREATE INDEX IDX_appointment_notification_outbox_pending ON appointment_notification_outbox (created_at) WHERE status = 'pending'"
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IDX_appointment_notification_outbox_pending");
    await queryRunner.query("DROP TABLE appointment_notification_outbox");
  }
}
