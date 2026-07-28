-- CreateEnum
CREATE TYPE "NegotiableInstrumentType" AS ENUM ('CHECK', 'PROMISSORY_NOTE');

-- CreateEnum
CREATE TYPE "NegotiableInstrumentDirection" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "NegotiableInstrumentStatus" AS ENUM ('PORTFOLIO', 'COLLECTED', 'PAID', 'BOUNCED', 'CANCELLED');

-- CreateTable
CREATE TABLE "NegotiableInstrument" (
    "id" TEXT NOT NULL,
    "instrumentNumber" TEXT NOT NULL,
    "instrumentType" "NegotiableInstrumentType" NOT NULL,
    "direction" "NegotiableInstrumentDirection" NOT NULL,
    "status" "NegotiableInstrumentStatus" NOT NULL DEFAULT 'PORTFOLIO',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3),
    "counterpartyKind" "CashTransactionCounterpartyKind" NOT NULL DEFAULT 'UNREGISTERED',
    "customerAccountId" TEXT,
    "supplierId" TEXT,
    "counterpartyName" TEXT,
    "endorserName" TEXT,
    "note" TEXT,
    "financialAccountId" TEXT,
    "cashTransactionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "NegotiableInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NegotiableInstrument_cashTransactionId_key" ON "NegotiableInstrument"("cashTransactionId");

-- CreateIndex
CREATE INDEX "NegotiableInstrument_status_dueDate_idx" ON "NegotiableInstrument"("status", "dueDate");

-- CreateIndex
CREATE INDEX "NegotiableInstrument_direction_dueDate_idx" ON "NegotiableInstrument"("direction", "dueDate");

-- CreateIndex
CREATE INDEX "NegotiableInstrument_deleted_dueDate_idx" ON "NegotiableInstrument"("deleted", "dueDate");

-- CreateIndex
CREATE INDEX "NegotiableInstrument_customerAccountId_idx" ON "NegotiableInstrument"("customerAccountId");

-- CreateIndex
CREATE INDEX "NegotiableInstrument_supplierId_idx" ON "NegotiableInstrument"("supplierId");

-- AddForeignKey
ALTER TABLE "NegotiableInstrument" ADD CONSTRAINT "NegotiableInstrument_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiableInstrument" ADD CONSTRAINT "NegotiableInstrument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiableInstrument" ADD CONSTRAINT "NegotiableInstrument_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiableInstrument" ADD CONSTRAINT "NegotiableInstrument_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "CashTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
