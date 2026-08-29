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

export type AdminExpenseApproverSettingItem = {
  approverUserId: string;
  approverName: string;
  approverEmail: string;
  notifyEmail: string | null;
};

export type AdminUpsertExpenseApproverSettingInput = {
  approverUserId: string;
  notifyEmail?: string | null;
};

export type AdminBackofficeUserOption = {
  id: string;
  name: string;
  email: string;
};
