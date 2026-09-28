import { AppDataSource } from "../../database/data-source.js";
import { AppointmentRepository } from "./appointment.repository.js";

describe("AppointmentRepository.create", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const serviceId = "22222222-2222-4222-8222-222222222222";
  const professionalId = "33333333-3333-4333-8333-333333333333";

  beforeAll(async () => {
    await AppDataSource.initialize();

    await AppDataSource.query(
      "DELETE FROM appointments WHERE tenant_id = $1",
      [tenantId]
    );
    await AppDataSource.query(
      "DELETE FROM blocked_times WHERE tenant_id = $1",
      [tenantId]
    );
    await AppDataSource.query(
      "DELETE FROM services WHERE id = $1",
      [serviceId]
    );
    await AppDataSource.query(
      "DELETE FROM employees WHERE id = $1",
      [professionalId]
    );
    await AppDataSource.query(
      "DELETE FROM tenants WHERE id = $1",
      [tenantId]
    );

    await AppDataSource.query(
      `INSERT INTO tenants (id, name, slug, timezone, status, max_daily_appointments)
       VALUES ($1, 'Race test tenant', 'race-test', 'UTC', 'published', 1)`,
      [tenantId]
    );
    await AppDataSource.query(
      `INSERT INTO services (id, tenant_id, name, duration, status)
       VALUES ($1, $2, 'Race test service', 30, 'active')`,
      [serviceId, tenantId]
    );
    await AppDataSource.query(
      `INSERT INTO employees (id, tenant_id, name, status)
       VALUES ($1, $2, 'Race test professional', 'active')`,
      [professionalId, tenantId]
    );
  });

  afterAll(async () => {
    await AppDataSource.query(
      "DELETE FROM appointments WHERE tenant_id = $1",
      [tenantId]
    );
    await AppDataSource.query(
      "DELETE FROM blocked_times WHERE tenant_id = $1",
      [tenantId]
    );
    await AppDataSource.query(
      "DELETE FROM services WHERE id = $1",
      [serviceId]
    );
    await AppDataSource.query(
      "DELETE FROM employees WHERE id = $1",
      [professionalId]
    );
    await AppDataSource.query(
      "DELETE FROM tenants WHERE id = $1",
      [tenantId]
    );

    await AppDataSource.destroy();
  });

  it("allows only one concurrent appointment when the daily limit is one", async () => {
    const repository = new AppointmentRepository(AppDataSource);
    const startAt = new Date("2099-10-01T12:00:00.000Z");

    const inputs = [0, 1].map((offset) => ({
      tenantId,
      customerName: `Customer ${offset}`,
      customerPhone: `+549110000000${offset}`,
      customerNotes: null,
      serviceId,
      professionalId,
      startAt: new Date(startAt.getTime() + offset * 60 * 60 * 1000),
      endAt: new Date(startAt.getTime() + (offset * 60 + 30) * 60 * 1000),
      timezone: "UTC",
      maxDailyAppointments: 1
    }));

    const results = await Promise.allSettled(
      inputs.map((input) => repository.create(input))
    );

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled"
    );
    const rejected = results.filter(
      (result) => result.status === "rejected"
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      rejected[0].reason?.constructor.name
    ).toBe("AppointmentDailyLimitError");

    const [{ count }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM appointments
       WHERE tenant_id = $1
         AND status IN ('PENDING', 'CONFIRMED')`,
      [tenantId]
    );

    expect(Number(count)).toBe(1);
  });

  it("rejects an appointment when the professional is blocked", async () => {
    const repository = new AppointmentRepository(AppDataSource);
    const startAt = new Date("2099-10-02T12:00:00.000Z");

    await AppDataSource.query(
      `INSERT INTO blocked_times (tenant_id, professional_id, starts_at, ends_at, reason)
       VALUES ($1, $2, $3, $4, 'Vacation')`,
      [
        tenantId,
        professionalId,
        startAt,
        new Date(startAt.getTime() + 60 * 60 * 1000)
      ]
    );

    const input = {
      tenantId,
      customerName: "Blocked customer",
      customerPhone: "+5491100000010",
      customerNotes: null,
      serviceId,
      professionalId,
      startAt: new Date(startAt.getTime() + 15 * 60 * 1000),
      endAt: new Date(startAt.getTime() + 45 * 60 * 1000),
      timezone: "UTC",
      maxDailyAppointments: 1
    };

    await expect(repository.create(input)).rejects.toMatchObject({
      message: "El profesional está bloqueado en el horario seleccionado."
    });
  });
});
