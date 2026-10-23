import { EntityManager } from "typeorm";
import { Appointment } from "../../database/entities/appointment.entity.js";

export type AppointmentNotificationType =
  | "appointment.created"
  | "appointment.cancelled"
  | "appointment.rescheduled";

// Only the data needed to notify the customer is snapshotted. The management
// token must never be written to an event or plain-text queue payload.
export async function enqueueAppointmentNotification(
  manager: EntityManager,
  appointment: Appointment,
  eventType: AppointmentNotificationType
): Promise<void> {
  const payload = {
    customerPhone: appointment.customerPhone,
    customerName: appointment.customerName,
    serviceId: appointment.serviceId,
    professionalId: appointment.professionalId,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    status: appointment.status
  };
  await manager.query(
    `INSERT INTO appointment_notification_outbox
       (tenant_id, appointment_id, event_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [appointment.tenantId, appointment.id, eventType, JSON.stringify(payload)]
  );
}
