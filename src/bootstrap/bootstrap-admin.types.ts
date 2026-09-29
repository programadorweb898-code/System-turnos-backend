export interface BootstrapAdminConfig {
  businessName: string;
  businessSlug: string;
  timezone: string;
  adminEmail: string;
  adminPassword: string;
}

export interface BootstrapAdminInput extends BootstrapAdminConfig {
  maxDailyAppointments?: number;
  minimumBookingNoticeHours?: number;
}

export interface BootstrapAdminResult {
  tenantId: string;
  tenantSlug: string;
  adminUserId: string;
  adminEmail: string;
}
