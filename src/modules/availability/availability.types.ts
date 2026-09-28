export interface AvailabilityQuery {
  tenantId: string;
  serviceId: string;
  date: string;
  professionalId?: string;
}

export interface AvailabilitySlot {
  startAt: Date;
  endAt: Date;
  professionals: Array<{
    id: string;
    name: string;
  }>;
}
