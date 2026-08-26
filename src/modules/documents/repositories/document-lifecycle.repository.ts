import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { RecordBusinessDocumentLifecycleEventInput } from "@/modules/documents/contracts/document-lifecycle.contract";

export class DocumentLifecycleRepository {
  async createEvent(input: RecordBusinessDocumentLifecycleEventInput & {
    payloadHash?: string | null;
  }) {
    const tenantId = requireTenantId();

    return prisma.businessDocumentLifecycleEvent.create({
      data: {
        tenantId,
        businessDocumentId: input.businessDocumentId,
        eventType: input.eventType,
        status: input.status ?? null,
        externalStatus: input.externalStatus ?? null,
        providerCode: input.providerCode ?? null,
        integrationJobId: input.integrationJobId ?? null,
        dispatchId: input.dispatchId ?? null,
        auditLogId: input.auditLogId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorType: input.actorType ?? "SYSTEM",
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? input.requestId ?? null,
        summary: input.summary,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        ...(input.message
          ? {
              integrationMessages: {
                create: {
                  tenantId,
                  businessDocumentId: input.businessDocumentId,
                  integrationJobId: input.integrationJobId ?? null,
                  direction: input.message.direction,
                  channel: input.message.channel ?? null,
                  providerCode: input.message.providerCode ?? input.providerCode ?? null,
                  endpoint: input.message.endpoint ?? null,
                  messageType: input.message.messageType,
                  payloadHash: input.payloadHash ?? "",
                  payload: (input.message.payload as Prisma.InputJsonValue | undefined) ?? undefined,
                  headers: (input.message.headers as Prisma.InputJsonValue | undefined) ?? undefined,
                  statusCode: input.message.statusCode ?? null,
                  errorMessage: input.message.errorMessage ?? null,
                  occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
                },
              },
            }
          : {}),
      },
      include: {
        integrationMessages: true,
      },
    });
  }
}
