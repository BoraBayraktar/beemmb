export type DelegationStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type DelegationSummary = {
  id: string;
  grantorUserId: string;
  grantorName: string;
  granteeUserId: string;
  granteeName: string;
  startAt: string;
  endAt: string;
  revokedAt: string | null;
  status: DelegationStatus;
  createdAt: string;
  createdByUserId: string | null;
  createdByName: string | null;
};

export type CreateDelegationInput = {
  grantorUserId: string;
  granteeUserId: string;
  startAt: string;
  endAt: string;
  /** Bu vekaleti fiilen olusturan kullanici -- self-servis akista grantorUserId ile ayni. */
  createdByUserId: string;
};

export type ListDelegationsResult = {
  items: DelegationSummary[];
};
