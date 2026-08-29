-- CreateEnum
CREATE TYPE "ExpenseReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseItemOcrStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseApproverSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "notifyEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseApproverSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "status" "ExpenseReportStatus" NOT NULL DEFAULT 'DRAFT',
    "employeeUserId" TEXT NOT NULL,
    "approverUserId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "ExpenseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReportItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseReportId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "receiptNo" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "vendorName" TEXT NOT NULL,
    "description" TEXT,
    "receiptObjectKey" TEXT,
    "receiptUrl" TEXT,
    "receiptContentType" TEXT,
    "receiptSize" INTEGER,
    "ocrStatus" "ExpenseItemOcrStatus" NOT NULL DEFAULT 'SKIPPED',
    "ocrRawResult" JSONB,
    "ocrConfidence" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReportLifecycleEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseReportId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseReportLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_deleted_isActive_idx" ON "ExpenseCategory"("tenantId", "deleted", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_tenantId_slug_key" ON "ExpenseCategory"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApproverSetting_tenantId_key" ON "ExpenseApproverSetting"("tenantId");

-- CreateIndex
CREATE INDEX "ExpenseReport_tenantId_status_idx" ON "ExpenseReport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ExpenseReport_employeeUserId_status_idx" ON "ExpenseReport"("employeeUserId", "status");

-- CreateIndex
CREATE INDEX "ExpenseReport_approverUserId_status_idx" ON "ExpenseReport"("approverUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseReport_tenantId_reportNumber_key" ON "ExpenseReport"("tenantId", "reportNumber");

-- CreateIndex
CREATE INDEX "ExpenseReportItem_expenseReportId_idx" ON "ExpenseReportItem"("expenseReportId");

-- CreateIndex
CREATE INDEX "ExpenseReportItem_tenantId_idx" ON "ExpenseReportItem"("tenantId");

-- CreateIndex
CREATE INDEX "ExpenseReportLifecycleEvent_expenseReportId_occurredAt_idx" ON "ExpenseReportLifecycleEvent"("expenseReportId", "occurredAt");

-- CreateIndex
CREATE INDEX "ExpenseReportLifecycleEvent_tenantId_idx" ON "ExpenseReportLifecycleEvent"("tenantId");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproverSetting" ADD CONSTRAINT "ExpenseApproverSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproverSetting" ADD CONSTRAINT "ExpenseApproverSetting_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportItem" ADD CONSTRAINT "ExpenseReportItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportItem" ADD CONSTRAINT "ExpenseReportItem_expenseReportId_fkey" FOREIGN KEY ("expenseReportId") REFERENCES "ExpenseReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportItem" ADD CONSTRAINT "ExpenseReportItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportLifecycleEvent" ADD CONSTRAINT "ExpenseReportLifecycleEvent_expenseReportId_fkey" FOREIGN KEY ("expenseReportId") REFERENCES "ExpenseReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReportLifecycleEvent" ADD CONSTRAINT "ExpenseReportLifecycleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CollectionRecord_tenantId_onlineCollectionProvider_onlineC_key" RENAME TO "CollectionRecord_tenantId_onlineCollectionProvider_onlineCo_key";

-- RenameIndex
ALTER INDEX "InventoryIntegrationMapping_tenantId_channel_externalProdu_key" RENAME TO "InventoryIntegrationMapping_tenantId_channel_externalProduc_key";

-- RenameIndex
ALTER INDEX "InventoryIntegrationMapping_tenantId_channel_externalSku_e_key" RENAME TO "InventoryIntegrationMapping_tenantId_channel_externalSku_ex_key";

-- Seed: Masraf Bildirimleri RBAC izinleri
INSERT INTO "Permission" ("id", "key", "module", "action", "menuKey", "name", "createdAt", "updatedAt")
VALUES
  ('perm-expense-reports-submit', 'expenseReports.submit', 'expenseReports', 'submit', 'expense-reports', 'Masraf bildirimi oluşturma ve gönderme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm-expense-reports-approve', 'expenseReports.approve', 'expenseReports', 'approve', 'expense-reports-approvals', 'Masraf bildirimlerini onaylama/reddetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm-expense-reports-manage', 'expenseReports.manage', 'expenseReports', 'manage', 'expense-reports-all', 'Tüm masraf bildirimlerini yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm-expense-settings-manage', 'expenseSettings.manage', 'expenseSettings', 'manage', 'expense-reports-settings', 'Masraf onaycısı ve kategori ayarlarını yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "menuKey" = EXCLUDED."menuKey",
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

-- submit + approve: tum sistem rolleri (ozel bir "calisan" rolu yok, her User
-- bu rollerden birine sahip staff'tir; onay yetkisi asil olarak service
-- katmaninda approverUserId eslesmesiyle sinirlanir)
INSERT INTO "RolePermission" ("id", "tenantId", "roleId", "permissionId")
SELECT r."id" || '-' || p."key", r."tenantId", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('expenseReports.submit', 'expenseReports.approve')
WHERE r."key" IN ('super-admin', 'operation', 'auditor', 'finance', 'accountant', 'catalog-manager', 'integration-manager')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- manage: super-admin, operation, finance, accountant (incomingInvoices.manage ile ayni set)
INSERT INTO "RolePermission" ("id", "tenantId", "roleId", "permissionId")
SELECT r."id" || '-' || p."key", r."tenantId", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'expenseReports.manage'
WHERE r."key" IN ('super-admin', 'operation', 'finance', 'accountant')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- expenseSettings.manage: super-admin, operation, finance
INSERT INTO "RolePermission" ("id", "tenantId", "roleId", "permissionId")
SELECT r."id" || '-' || p."key", r."tenantId", r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'expenseSettings.manage'
WHERE r."key" IN ('super-admin', 'operation', 'finance')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Seed: modul katalogu + platform tenant'ina (beemmb) entitlement
INSERT INTO "ModuleCatalog" ("id", "key", "name", "sortOrder", "updatedAt")
VALUES ('module-expense-reports', 'expenseReports', 'Masraf Bildirimleri', 8, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "TenantModuleEntitlement" ("id", "tenantId", "moduleKey", "isEnabled", "updatedAt")
SELECT 'ent-beemmb-expenseReports', t."id", 'expenseReports', true, CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE t."slug" = 'beemmb'
ON CONFLICT ("tenantId", "moduleKey") DO NOTHING;
