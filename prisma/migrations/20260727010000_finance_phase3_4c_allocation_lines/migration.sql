-- AlterEnum
ALTER TYPE "FinanceAllocationTargetType" ADD VALUE 'BUSINESS_DOCUMENT_LINE';

-- AlterTable
ALTER TABLE "FinanceAllocationLink" ADD COLUMN "businessDocumentLineId" TEXT;

-- AddForeignKey
ALTER TABLE "FinanceAllocationLink" ADD CONSTRAINT "FinanceAllocationLink_businessDocumentLineId_fkey" FOREIGN KEY ("businessDocumentLineId") REFERENCES "BusinessDocumentLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "FinanceAllocationLink_businessDocumentLineId_idx" ON "FinanceAllocationLink"("businessDocumentLineId");

-- Normalize legacy collection cash movement references (raw order id -> order: prefix)
UPDATE "CashTransaction" AS ct
SET "sourceReferenceId" = CONCAT('order:', ct."sourceReferenceId")
FROM "Order" AS o
WHERE
  ct."sourceType" = 'COLLECTION'
  AND ct."sourceReferenceId" = o."id"
  AND ct."sourceReferenceId" NOT LIKE '%:%';
