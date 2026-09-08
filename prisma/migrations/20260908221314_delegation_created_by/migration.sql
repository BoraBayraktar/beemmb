-- AlterTable
ALTER TABLE "Delegation" ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Delegation_tenantId_createdAt_idx" ON "Delegation"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
