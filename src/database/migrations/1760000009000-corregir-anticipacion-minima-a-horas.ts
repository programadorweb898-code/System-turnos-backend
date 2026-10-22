import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Corrige los datos de `minimum_booking_notice_hours`.
 *
 * La migracion 1760000002000 renombro la columna `minimum_booking_notice_minutes`
 * a `minimum_booking_notice_hours` sin convertir los valores existentes. Un
 * tenant configurado con 120 minutos quedo con el valor 120, que ahora el
 * sistema interpreta como 120 horas.
 *
 * El valor original no siempre se puede reconstruir de forma exacta: 90 minutos
 * no equivalen a un numero entero de horas. Se aplica `ceil(minutes / 60)`,
 * es decir, se redondea hacia arriba, de modo que la anticipacion efectiva
 * nunca sea menor que la que el negocio habia configurado.
 */
export class CorregirAnticipacionMinimaAHoras1760000009000 implements MigrationInterface {
  name = "CorregirAnticipacionMinimaAHoras1760000009000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenants"
      SET "minimum_booking_notice_hours" = CEIL("minimum_booking_notice_hours"::numeric / 60)::integer
    `);
  }

  /**
   * La conversion no es exactamente reversible. Multiplicar por 60 devuelve un
   * valor aproximado en minutos: un tenant migrado de 90 a 2 horas vuelve a
   * 120 minutos, no a 90. Para recuperar el dato original habria que restaurar
   * un backup previo a la migracion 1760000002000.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenants"
      SET "minimum_booking_notice_hours" = ("minimum_booking_notice_hours" * 60)::integer
    `);
  }
}
