export type UserNotificationType =
  | "PRODUCT_QUESTION_CREATED"
  | "INVENTORY_ALERT_CREATED"
  | "STOCK_COUNT_APPLIED"
  | "EXPENSE_REPORT_SUBMITTED"
  | "EXPENSE_REPORT_DECIDED";

export type UserNotificationChannel = "IN_APP" | "EMAIL";

export type UserNotificationItem = {
  id: string;
  type: UserNotificationType;
  channel: UserNotificationChannel;
  title: string;
  message: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ListUserNotificationsQuery = {
  userId: string;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListUserNotificationsResult = {
  items: UserNotificationItem[];
  unreadCount: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateUserNotificationInput = {
  userId: string;
  type: UserNotificationType;
  channel: UserNotificationChannel;
  title: string;
  message: string;
  linkUrl?: string | null;
};

export type CreateUserNotificationsInput = {
  recipients: Array<{ id: string }>;
  type: UserNotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
  channels: UserNotificationChannel[];
};

export type ProcessNotificationEmailQueueInput = {
  limit?: number;
  requireLiveTransport?: boolean;
};

export type ProcessNotificationEmailQueueResult = {
  processed: number;
  sent: number;
  failed: number;
};
