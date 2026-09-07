import { z } from "zod";

import type { CreateDelegationInput, DelegationSummary, ListDelegationsResult } from "@/modules/delegation/contracts/delegation.contract";
import { DelegationRepository } from "@/modules/delegation/repositories/delegation.repository";
import { auditLogService } from "@/modules/system/services/audit-log.service";
import { notificationService } from "@/modules/system/services/notification.service";

const MAX_DELEGATION_DAYS = 365;

const createDelegationSchema = z
  .object({
    grantorUserId: z.string().trim().min(1),
    granteeUserId: z.string().trim().min(1),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  })
  .refine((value) => value.grantorUserId !== value.granteeUserId, {
    message: "Kendinize vekalet veremezsiniz.",
    path: ["granteeUserId"],
  })
  .refine((value) => new Date(value.endAt).getTime() > new Date(value.startAt).getTime(), {
    message: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.",
    path: ["endAt"],
  })
  .refine((value) => new Date(value.endAt).getTime() - new Date(value.startAt).getTime() <= MAX_DELEGATION_DAYS * 24 * 60 * 60 * 1000, {
    message: "Vekalet süresi en fazla 1 yıl olabilir.",
    path: ["endAt"],
  });

export class DelegationPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DelegationPolicyError";
  }
}

function computeStatus(row: { revokedAt: Date | null; startAt: Date; endAt: Date }, now: Date): DelegationSummary["status"] {
  if (row.revokedAt) {
    return "REVOKED";
  }
  if (row.endAt.getTime() < now.getTime()) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

function mapSummary(row: {
  id: string;
  grantorUserId: string;
  grantor: { id: string; name: string };
  granteeUserId: string;
  grantee: { id: string; name: string };
  startAt: Date;
  endAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}, now = new Date()): DelegationSummary {
  return {
    id: row.id,
    grantorUserId: row.grantorUserId,
    grantorName: row.grantor.name,
    granteeUserId: row.granteeUserId,
    granteeName: row.grantee.name,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    status: computeStatus(row, now),
    createdAt: row.createdAt.toISOString(),
  };
}

export class DelegationService {
  constructor(private readonly repository: DelegationRepository) {}

  async createDelegation(tenantId: string, input: CreateDelegationInput): Promise<DelegationSummary> {
    const parsed = createDelegationSchema.parse(input);

    const grantee = await this.repository.findUserInTenant(tenantId, parsed.granteeUserId);
    if (!grantee) {
      throw new DelegationPolicyError("Vekalet verilecek kullanıcı bulunamadı.");
    }

    const startAt = new Date(parsed.startAt);
    const endAt = new Date(parsed.endAt);

    const overlapping = await this.repository.listOverlapping(tenantId, parsed.grantorUserId, parsed.granteeUserId, startAt, endAt);
    if (overlapping.length > 0) {
      throw new DelegationPolicyError("Bu kullanıcıya bu tarih aralığında zaten aktif bir vekalet verilmiş.");
    }

    const created = await this.repository.create({
      tenantId,
      grantorUserId: parsed.grantorUserId,
      granteeUserId: parsed.granteeUserId,
      startAt,
      endAt,
    });

    const summary = mapSummary(created);

    await notificationService.createForRecipients({
      recipients: [{ id: parsed.granteeUserId }],
      type: "DELEGATION_GRANTED",
      title: "Size vekalet verildi",
      message: `${summary.grantorName}, ${startAt.toLocaleString("tr-TR")} - ${endAt.toLocaleString("tr-TR")} aralığında size vekalet verdi.`,
      linkUrl: "/admin/delegation",
      channels: ["IN_APP", "EMAIL"],
    });

    await auditLogService.record({
      entityType: "DELEGATION",
      entityId: created.id,
      action: "CREATE",
      actorUserId: parsed.grantorUserId,
      tenantId,
      module: "delegation",
      summary: `${summary.grantorName}, ${summary.granteeName} kullanıcısına vekalet verdi.`,
      metadata: { grantorUserId: parsed.grantorUserId, granteeUserId: parsed.granteeUserId, startAt: summary.startAt, endAt: summary.endAt },
    });

    return summary;
  }

  async revokeDelegation(tenantId: string, id: string, actorUserId: string): Promise<void> {
    const existing = await this.repository.findById(tenantId, id);
    if (!existing) {
      throw new DelegationPolicyError("Vekalet bulunamadı.");
    }
    if (existing.grantorUserId !== actorUserId) {
      throw new DelegationPolicyError("Yalnızca verdiğiniz vekaleti iptal edebilirsiniz.");
    }
    if (existing.revokedAt) {
      throw new DelegationPolicyError("Bu vekalet zaten iptal edilmiş.");
    }

    await this.repository.revoke(tenantId, id, actorUserId);

    await auditLogService.record({
      entityType: "DELEGATION",
      entityId: id,
      action: "DELETE",
      actorUserId,
      tenantId,
      module: "delegation",
      summary: `${existing.grantor.name}, ${existing.grantee.name} kullanıcısına verdiği vekaleti iptal etti.`,
      metadata: { grantorUserId: existing.grantorUserId, granteeUserId: existing.granteeUserId },
    });
  }

  async listGivenByUser(tenantId: string, userId: string): Promise<ListDelegationsResult> {
    const rows = await this.repository.listByGrantor(tenantId, userId);
    return { items: rows.map((row) => mapSummary(row)) };
  }

  async listReceivedByUser(tenantId: string, userId: string): Promise<ListDelegationsResult> {
    const rows = await this.repository.listByGrantee(tenantId, userId);
    return { items: rows.map((row) => mapSummary(row)) };
  }

  async getActiveGrantorsFor(tenantId: string, granteeUserId: string, at: Date = new Date()): Promise<string[]> {
    return this.repository.getActiveGrantorsFor(tenantId, granteeUserId, at);
  }
}

export const delegationService = new DelegationService(new DelegationRepository());
