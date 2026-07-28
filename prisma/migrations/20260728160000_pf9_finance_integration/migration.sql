-- AlterEnum
ALTER TYPE "IntegrationChannel" ADD VALUE 'BANK_SANDBOX';

-- AlterEnum
ALTER TYPE "IntegrationJobType" ADD VALUE 'BANK_STATEMENT_SYNC';

-- AlterEnum
ALTER TYPE "IntegrationEntityType" ADD VALUE 'FINANCIAL_ACCOUNT';

-- AlterTable
ALTER TABLE "CollectionRecord" ADD COLUMN     "onlineCollectionProvider" TEXT,
ADD COLUMN     "onlineCollectionExternalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRecord_onlineCollectionProvider_onlineCollectionExternalId_key" ON "CollectionRecord"("onlineCollectionProvider", "onlineCollectionExternalId");
