-- CreateEnum
CREATE TYPE "FinanceAllocationTargetType" AS ENUM ('ORDER', 'BUSINESS_DOCUMENT');

-- CreateTable
CREATE TABLE "FinanceAllocationLink" (
    "id" TEXT NOT NULL,
    "collectionRecordId" TEXT,
    "paymentRecordId" TEXT,
    "targetType" "FinanceAllocationTargetType" NOT NULL,
    "orderId" TEXT,
    "businessDocumentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "FinanceAllocationLink_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinanceAllocationLink" ADD CONSTRAINT "FinanceAllocationLink_collectionRecordId_fkey" FOREIGN KEY ("collectionRecordId") REFERENCES "CollectionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAllocationLink" ADD CONSTRAINT "FinanceAllocationLink_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAllocationLink" ADD CONSTRAINT "FinanceAllocationLink_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAllocationLink" ADD CONSTRAINT "FinanceAllocationLink_businessDocumentId_fkey" FOREIGN KEY ("businessDocumentId") REFERENCES "BusinessDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "FinanceAllocationLink_collectionRecordId_idx" ON "FinanceAllocationLink"("collectionRecordId");

-- CreateIndex
CREATE INDEX "FinanceAllocationLink_paymentRecordId_idx" ON "FinanceAllocationLink"("paymentRecordId");

-- CreateIndex
CREATE INDEX "FinanceAllocationLink_orderId_idx" ON "FinanceAllocationLink"("orderId");

-- CreateIndex
CREATE INDEX "FinanceAllocationLink_businessDocumentId_idx" ON "FinanceAllocationLink"("businessDocumentId");

-- CreateIndex
CREATE INDEX "FinanceAllocationLink_deleted_createdAt_idx" ON "FinanceAllocationLink"("deleted", "createdAt");

-- Backfill payment cash movements with supplier FK
UPDATE "CashTransaction" AS ct
SET
  "supplierId" = pr."supplierId",
  "counterpartyKind" = 'SUPPLIER',
  "sourceReferenceId" = CONCAT('payment:', pr."id")
FROM "PaymentRecord" AS pr
WHERE
  ct."sourceType" = 'PAYMENT'
  AND ct."supplierId" IS NULL
  AND ct."sourceReferenceId" = CONCAT('payment:', pr."id");

UPDATE "CashTransaction" AS ct
SET
  "supplierId" = pr."supplierId",
  "counterpartyKind" = 'SUPPLIER',
  "sourceReferenceId" = CONCAT('payment:', pr."id")
FROM "PaymentRecord" AS pr
WHERE
  ct."sourceType" = 'PAYMENT'
  AND ct."supplierId" IS NULL
  AND pr."financialAccountId" IS NOT NULL
  AND ct."accountId" = pr."financialAccountId"
  AND ct."amount" = pr."amount"
  AND ABS(EXTRACT(EPOCH FROM (ct."transactionAt" - pr."paidAt"))) < 300;
