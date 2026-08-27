import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type {
  UserNotificationChannel,
  UserNotificationType,
} from "@/modules/system/contracts/notification.contract";

export class NotificationRepository {
  async createMany(items: Array<{
    userId: string;
    type: UserNotificationType;
    channel: UserNotificationChannel;
    title: string;
    message: string;
    linkUrl?: string | null;
  }>) {
    if (items.length === 0) {
      return;
    }

    const tenantId = requireTenantId();

    await prisma.userNotification.createMany({
      data: items.map((item) => ({
        tenantId,
        userId: item.userId,
        type: item.type,
        channel: item.channel,
        title: item.title,
        message: item.message,
        linkUrl: item.linkUrl ?? null,
      })),
    });
  }

  async listInApp(args: {
    userId: string;
    unreadOnly?: boolean;
    page: number;
    pageSize: number;
  }) {
    return prisma.userNotification.findMany({
      where: {
        userId: args.userId,
        channel: "IN_APP",
        ...(args.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    });
  }

  async countInApp(args: { userId: string; unreadOnly?: boolean }) {
    return prisma.userNotification.count({
      where: {
        userId: args.userId,
        channel: "IN_APP",
        ...(args.unreadOnly ? { readAt: null } : {}),
      },
    });
  }

  async countUnreadInApp(userId: string) {
    return prisma.userNotification.count({
      where: {
        userId,
        channel: "IN_APP",
        readAt: null,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.userNotification.updateMany({
      where: {
        id,
        userId,
        channel: "IN_APP",
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.userNotification.updateMany({
      where: {
        userId,
        channel: "IN_APP",
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async markEmailAsSent(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    await prisma.userNotification.updateMany({
      where: {
        id: {
          in: ids,
        },
        channel: "EMAIL",
        sentAt: null,
      },
      data: {
        sentAt: new Date(),
      },
    });
  }

  async listPendingEmail(limit: number) {
    return prisma.userNotification.findMany({
      where: {
        channel: "EMAIL",
        sentAt: null,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    });
  }

  async markEmailAsSentById(id: string) {
    await prisma.userNotification.updateMany({
      where: {
        id,
        channel: "EMAIL",
        sentAt: null,
      },
      data: {
        sentAt: new Date(),
      },
    });
  }
}
