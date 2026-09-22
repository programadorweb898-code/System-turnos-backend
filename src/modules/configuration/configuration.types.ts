export interface CreateServiceInput {
  tenantId: string;
  name: string;
  description?: string;
  duration: number;
}

export interface CreateEmployeeInput {
  tenantId: string;
  name: string;
}

export interface CreateBusinessHourInput {
  tenantId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateBlockedTimeInput {
  tenantId: string;
  startsAt: Date;
  endsAt: Date;
  reason?: string;
}
