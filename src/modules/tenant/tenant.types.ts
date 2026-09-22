export const TENANT_STATUSES = ["draft", "published", "unpublished"] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

export interface CreateTenantInput {
  name: string;
  slug: string;
  timezone: string;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  timezone?: string;
}
