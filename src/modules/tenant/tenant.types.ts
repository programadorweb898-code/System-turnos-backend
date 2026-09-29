export const TENANT_STATUSES = ["draft", "published", "unpublished"] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

export interface CreateTenantInput {
  name: string;
  slug: string;
  timezone: string;
  maxDailyAppointments?: number;
  minimumBookingNoticeHours?: number;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  timezone?: string;
  maxDailyAppointments?: number;
  minimumBookingNoticeHours?: number;
}

export interface TenantPublicationRequirements {
  hasName: boolean;
  hasValidSlug: boolean;
  hasValidTimezone: boolean;
  hasActiveService: boolean;
  hasActiveProfessional: boolean;
  hasEligibleAssignment: boolean;
  hasBusinessHours: boolean;
}

export const MISSING_PUBLICATION_REQUIREMENTS: ReadonlyArray<{
  key: keyof TenantPublicationRequirements;
  message: string;
}> = [
  { key: "hasName", message: "Debe configurar un nombre comercial." },
  { key: "hasValidSlug", message: "Debe configurar un slug público válido." },
  { key: "hasValidTimezone", message: "Debe configurar una zona horaria válida." },
  { key: "hasActiveService", message: "Debe existir al menos un servicio activo con duración positiva." },
  { key: "hasActiveProfessional", message: "Debe existir al menos un profesional activo." },
  {
    key: "hasEligibleAssignment",
    message: "Debe existir al menos un profesional activo asignado a un servicio activo."
  },
  { key: "hasBusinessHours", message: "Debe configurarse el horario de atención." }
];
