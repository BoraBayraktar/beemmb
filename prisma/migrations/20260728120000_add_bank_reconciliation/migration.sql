-- CreateEnum
CREATE TYPE "BankStatementImportStatus" AS ENUM ('DRAFT', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BankStatementLineMatchStatus" AS ENUM ('UNMATCHED', 'SUGGESTED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "BankReconciliationMatchStatus" AS ENUM ('SUGGESTED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "BankStatementImport" (
    "id" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "fileName" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "status" "BankStatementImportStatus" NOT NULL DEFAULT 'DRAFT',
    "importedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementLine" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "lineIndex" INTEGER NOT NULL,
    "transactionAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "signedAmount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2),
    "matchStatus" "BankStatementLineMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationMatch" (
    "id" TEXT NOT NULL,
    "statementLineId" TEXT NOT NULL,
    "cashTransactionId" TEXT,
    "status" "BankReconciliationMatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankStatementImport_financialAccountId_createdAt_idx" ON "BankStatementImport"("financialAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "BankStatementImport_status_idx" ON "BankStatementImport"("status");

-- CreateIndex
CREATE INDEX "BankStatementLine_importId_matchStatus_idx" ON "BankStatementLine"("importId", "matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementLine_importId_lineIndex_key" ON "BankStatementLine"("importId", "lineIndex");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliationMatch_statementLineId_key" ON "BankReconciliationMatch"("statementLineId");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliationMatch_cashTransactionId_key" ON "BankReconciliationMatch"("cashTransactionId");

-- CreateIndex
CREATE INDEX "BankReconciliationMatch_status_idx" ON "BankReconciliationMatch"("status");

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_importId_fkey" FOREIGN KEY ("importId") REFERENCES "BankStatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "BankStatementLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "CashTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
