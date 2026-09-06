export type AdminExpenseCategoryItem = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type AdminUpsertExpenseCategoryInput = {
  id?: string;
  name: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type AdminExpenseApprovalChainStepItem = {
  id: string;
  stepOrder: number;
  approverUserId: string;
  approverName: string;
  approverEmail: string;
  notifyEmail: string | null;
  description: string | null;
};

export type AdminUpsertExpenseApprovalChainStepInput = {
  stepOrder: number;
  approverUserId: string;
  notifyEmail?: string | null;
  description?: string | null;
};

export type AdminUpsertExpenseApprovalChainInput = {
  steps: AdminUpsertExpenseApprovalChainStepInput[];
};

export type AdminBackofficeUserOption = {
  id: string;
  name: string;
  email: string;
};
