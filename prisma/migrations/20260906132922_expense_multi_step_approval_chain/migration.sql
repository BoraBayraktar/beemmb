-- CreateEnum
CREATE TYPE "ExpenseReportApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');

-- AlterEnum
ALTER TYPE "ExpenseReportStatus" ADD VALUE 'RETURNED';

-- CreateTable
CREATE TABLE "ExpenseApprovalChainStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "notifyEmail" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseApprovalChainStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReportApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseReportId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "notifyEmail" TEXT,
    "description" TEXT,
    "status" "ExpenseReportApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReportApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseApprovalChainStep_tenantId_idx" ON "ExpenseApprovalChainStep"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApprovalChainStep_tenantId_stepOrder_key" ON "ExpenseApprovalChainStep"("tenantId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApprovalChainStep_tenantId_approverUserId_key" ON "ExpenseApprovalChainStep"("tenantId", "approverUserId");

-- CreateIndex
CREATE INDEX "ExpenseReportApproval_tenantId_idx" ON "ExpenseReportApproval"("tenantId");

-- CreateIndex
CREATE INDEX "ExpenseReportApproval_approverUserId_status_idx" ON "ExpenseReportApproval"("approverUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseReportApproval_expenseReportId_round_stepOrder_key" ON "ExpenseReportApproval"("expenseReportId", "round", "stepOrder");

-- AddForeignKey
ALTER TABLE "ExpenseApprovalChainStep" ADD CONSTRAINT "ExpenseApprovalChainStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApprovalChainStep" ADD CONSTRAINT "ExpenseApprovalChainStep_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportApproval" ADD CONSTRAINT "ExpenseReportApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportApproval" ADD CONSTRAINT "ExpenseReportApproval_expenseReportId_fkey" FOREIGN KEY ("expenseReportId") REFERENCES "ExpenseReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportApproval" ADD CONSTRAINT "ExpenseReportApproval_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: add new pointer/round columns to ExpenseReport (old approverUserId/decisionNote kept for now, dropped after backfill below)
ALTER TABLE "ExpenseReport"
ADD COLUMN     "currentApprovalStepOrder" INTEGER,
ADD COLUMN     "currentApproverUserId" TEXT,
ADD COLUMN     "currentRound" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ExpenseReport_currentApproverUserId_status_idx" ON "ExpenseReport"("currentApproverUserId", "status");

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_currentApproverUserId_fkey" FOREIGN KEY ("currentApproverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: tek onaycı ayarını, tenant başına 1. adım olarak onay akışı zincirine taşı
INSERT INTO "ExpenseApprovalChainStep" ("id", "tenantId", "stepOrder", "approverUserId", "notifyEmail", "description", "createdAt", "updatedAt")
SELECT "id", "tenantId", 1, "approverUserId", "notifyEmail", NULL, "createdAt", "updatedAt"
FROM "public"."ExpenseApproverSetting";

-- DataMigration: mevcut masraf bildirimlerinin tek onaycı kaydini 1. tur / 1. adim onay gecmisine tasi
INSERT INTO "ExpenseReportApproval" ("id", "tenantId", "expenseReportId", "round", "stepOrder", "approverUserId", "notifyEmail", "description", "status", "decisionNote", "decidedAt", "createdAt", "updatedAt")
SELECT
  "id" || '_r1s1',
  "tenantId",
  "id",
  1,
  1,
  "approverUserId",
  NULL,
  NULL,
  CASE "status"
    WHEN 'APPROVED' THEN 'APPROVED'::"ExpenseReportApprovalStatus"
    WHEN 'REJECTED' THEN 'REJECTED'::"ExpenseReportApprovalStatus"
    ELSE 'PENDING'::"ExpenseReportApprovalStatus"
  END,
  "decisionNote",
  "decidedAt",
  COALESCE("submittedAt", "createdAt"),
  "updatedAt"
FROM "ExpenseReport"
WHERE "approverUserId" IS NOT NULL;

-- DataMigration: onaya gönderilmiş (SUBMITTED) bildirimlerin güncel onaycı isaretcisini tasi
UPDATE "ExpenseReport"
SET "currentApproverUserId" = "approverUserId", "currentApprovalStepOrder" = 1
WHERE "status" = 'SUBMITTED';

-- DropForeignKey
ALTER TABLE "public"."ExpenseApproverSetting" DROP CONSTRAINT "ExpenseApproverSetting_approverUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseApproverSetting" DROP CONSTRAINT "ExpenseApproverSetting_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseReport" DROP CONSTRAINT "ExpenseReport_approverUserId_fkey";

-- DropIndex
DROP INDEX "public"."ExpenseReport_approverUserId_status_idx";

-- AlterTable
ALTER TABLE "ExpenseReport" DROP COLUMN "approverUserId",
DROP COLUMN "decisionNote";

-- DropTable
DROP TABLE "public"."ExpenseApproverSetting";
