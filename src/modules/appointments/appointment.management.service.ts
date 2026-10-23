import {
  AppointmentListQuery,
  AppointmentManagementRepository
} from "./appointment.management.repository.js";

export class AppointmentManagementService {
  constructor(private readonly repository = new AppointmentManagementRepository()) {}

  list(tenantId: string, query: AppointmentListQuery) {
    return this.repository.list(tenantId, query);
  }

  cancel(tenantId: string, appointmentId: string, actorUserId: string, reason: string | null) {
    return this.repository.cancel(tenantId, appointmentId, actorUserId, reason);
  }

  reschedule(
    tenantId: string,
    appointmentId: string,
    actorUserId: string,
    startAt: Date,
    professionalId?: string
  ) {
    return this.repository.reschedule(tenantId, appointmentId, actorUserId, startAt, professionalId);
  }
}
