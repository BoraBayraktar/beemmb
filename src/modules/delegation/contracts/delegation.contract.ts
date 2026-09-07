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
};

export type CreateDelegationInput = {
  grantorUserId: string;
  granteeUserId: string;
  startAt: string;
  endAt: string;
};

export type ListDelegationsResult = {
  items: DelegationSummary[];
};
