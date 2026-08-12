import { z } from "zod";

import type {
  CreateUserNotificationsInput,
  ListUserNotificationsQuery,
  ListUserNotificationsResult,
  ProcessNotificationEmailQueueInput,
  ProcessNotificationEmailQueueResult,
  UserNotificationItem,
} from "@/modules/system/contracts/notification.contract";
import { NotificationEmailRepository } from "@/modules/system/repositories/notification-email.repository";
import { NotificationRepository } from "@/modules/system/repositories/notification.repository";

const listNotificationsSchema = z.object({
  userId: z.string().trim().min(1),
  unreadOnly: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const createUserNotificationsSchema = z.object({
  recipients: z.array(z.object({ id: z.string().trim().min(1) })).min(1),
  type: z.enum(["PRODUCT_QUESTION_CREATED", "INVENTORY_ALERT_CREATED", "STOCK_COUNT_APPLIED"]),
  title: z.string().trim().min(1).max(180),
  message: z.string().trim().min(1).max(2000),
  linkUrl: z.string().trim().optional().nullable(),
  channels: z.array(z.enum(["IN_APP", "EMAIL"]))
    .min(1)
    .refine((value) => new Set(value).size === value.length, { message: "Duplicate channel values are not allowed" }),
});

const processEmailQueueSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  requireLiveTransport: z.boolean().default(false),
});

function mapNotification(item: {
  id: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  linkUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
}): UserNotificationItem {
  return {
    id: item.id,
    type: item.type as UserNotificationItem["type"],
    channel: item.channel as UserNotificationItem["channel"],
    title: item.title,
    message: item.message,
    linkUrl: item.linkUrl,
    readAt: item.readAt ? item.readAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
  };
}

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly emailRepository: NotificationEmailRepository,
  ) {}

  async createForRecipients(input: CreateUserNotificationsInput) {
    const parsed = createUserNotificationsSchema.parse(input);

    const items = parsed.recipients.flatMap((recipient) => (
      parsed.channels.map((channel) => ({
        userId: recipient.id,
        channel,
        type: parsed.type,
        title: parsed.title,
        message: parsed.message,
        linkUrl: parsed.linkUrl ?? null,
      }))
    ));

    await this.repository.createMany(items);
  }

  async listInAppForUser(query: ListUserNotificationsQuery): Promise<ListUserNotificationsResult> {
    const parsed = listNotificationsSchema.parse(query);

    const [items, total, unreadCount] = await Promise.all([
      this.repository.listInApp(parsed),
      this.repository.countInApp({
        userId: parsed.userId,
        unreadOnly: parsed.unreadOnly,
      }),
      this.repository.countUnreadInApp(parsed.userId),
    ]);

    return {
      items: items.map(mapNotification),
      unreadCount,
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async markAsRead(id: string, userId: string) {
    await this.repository.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string) {
    await this.repository.markAllAsRead(userId);
  }

  async sendEmail(
    input: { to: string; subject: string; text: string },
    options?: { requireLiveTransport?: boolean },
  ) {
    await this.emailRepository.send(input, options);
  }

  async processEmailQueue(input: ProcessNotificationEmailQueueInput): Promise<ProcessNotificationEmailQueueResult> {
    const parsed = processEmailQueueSchema.parse(input);
    const pending = await this.repository.listPendingEmail(parsed.limit);

    let sent = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        await this.emailRepository.send({
          to: item.user.email,
          subject: item.title,
          text: item.message,
        }, {
          requireLiveTransport: parsed.requireLiveTransport,
        });

        await this.repository.markEmailAsSentById(item.id);
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    return {
      processed: pending.length,
      sent,
      failed,
    };
  }
}

export const notificationService = new NotificationService(
  new NotificationRepository(),
  new NotificationEmailRepository(),
);
