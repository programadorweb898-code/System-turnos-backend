export interface CreateAppointmentInput {
  tenantId: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  serviceId: string;
  startAt: Date;
  professionalId?: string;
}
