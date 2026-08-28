export type CariRole = "CUSTOMER" | "SUPPLIER" | "CARRIER";

export type AdminCariCarrierProfile = {
  trackingUrlTemplate: string | null;
  externalCodeTrendyol: number | null;
  externalCodePazarama: string | null;
  externalCodeHepsiburada: string | null;
};

export type AdminCariItem = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  photoUrl: string | null;
  iban: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  contactPersonEmail: string | null;
  address: string | null;
  note: string | null;
  defaultPaymentTermDays: number | null;
  creditLimit: number | null;
  isCustomer: boolean;
  isSupplier: boolean;
  isCarrier: boolean;
  isActive: boolean;
  carrierProfile: AdminCariCarrierProfile | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminCreateCariInput = {
  slug: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
  photoUrl?: string | null;
  iban?: string | null;
  bankName?: string | null;
  bankAccountHolder?: string | null;
  contactPersonName?: string | null;
  contactPersonPhone?: string | null;
  contactPersonEmail?: string | null;
  address?: string | null;
  note?: string | null;
  defaultPaymentTermDays?: number | null;
  creditLimit?: number | null;
  isCustomer?: boolean;
  isSupplier?: boolean;
  isCarrier?: boolean;
  isActive?: boolean;
  trackingUrlTemplate?: string | null;
  externalCodeTrendyol?: number | null;
  externalCodePazarama?: string | null;
  externalCodeHepsiburada?: string | null;
};

export type AdminUpdateCariInput = AdminCreateCariInput & {
  id: string;
};

export type AdminListCariFilter = {
  role?: CariRole;
  search?: string;
};
