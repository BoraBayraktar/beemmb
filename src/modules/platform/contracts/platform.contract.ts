export type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "ARCHIVED";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  taxNumber: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: TenantStatus;
  isPlatformTenant: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ModuleCatalogEntry = {
  key: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type TenantModuleEntitlement = {
  id: string;
  tenantId: string;
  moduleKey: string;
  isEnabled: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  note: string | null;
};

export type CreateTenantInput = {
  slug: string;
  name: string;
  legalName?: string;
  taxNumber?: string;
  contactEmail: string;
  contactPhone?: string;
};

export type UpdateTenantInput = {
  id: string;
  name?: string;
  legalName?: string;
  taxNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: TenantStatus;
};

export type SetTenantModuleEntitlementInput = {
  tenantId: string;
  moduleKey: string;
  isEnabled: boolean;
  grantedByUserId?: string;
  note?: string;
};
