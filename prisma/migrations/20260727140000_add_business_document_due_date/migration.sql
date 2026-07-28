-- AlterTable
ALTER TABLE "BusinessDocument" ADD COLUMN "dueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BusinessDocument_deleted_dueDate_idx" ON "BusinessDocument"("deleted", "dueDate");
