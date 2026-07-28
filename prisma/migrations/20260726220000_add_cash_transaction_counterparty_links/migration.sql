-- CreateEnum
CREATE TYPE "CashTransactionCounterpartyKind" AS ENUM ('CUSTOMER', 'SUPPLIER', 'UNREGISTERED');

-- AlterTable
ALTER TABLE "CashTransaction"
ADD COLUMN "counterpartyKind" "CashTransactionCounterpartyKind" NOT NULL DEFAULT 'UNREGISTERED',
ADD COLUMN "customerAccountId" TEXT,
ADD COLUMN "supplierId" TEXT;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CashTransaction_customerAccountId_transactionAt_idx" ON "CashTransaction"("customerAccountId", "transactionAt");

-- CreateIndex
CREATE INDEX "CashTransaction_supplierId_transactionAt_idx" ON "CashTransaction"("supplierId", "transactionAt");

-- Backfill collection-linked cash movements from order reference
UPDATE "CashTransaction" AS ct
SET
  "customerAccountId" = o."customerAccountId",
  "counterpartyKind" = 'CUSTOMER'
FROM "Order" AS o
WHERE
  ct."sourceType" = 'COLLECTION'
  AND ct."sourceReferenceId" = o."id"
  AND o."customerAccountId" IS NOT NULL;

-- Backfill collection reference prefix (legacy rows)
UPDATE "CashTransaction" AS ct
SET
  "customerAccountId" = o."customerAccountId",
  "counterpartyKind" = 'CUSTOMER'
FROM "Order" AS o
WHERE
  ct."sourceType" = 'COLLECTION'
  AND ct."sourceReferenceId" = CONCAT('order:', o."id")
  AND o."customerAccountId" IS NOT NULL
  AND ct."customerAccountId" IS NULL;
