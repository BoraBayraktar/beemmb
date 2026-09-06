-- AlterTable
ALTER TABLE "ExpenseApprovalChainStep" ADD COLUMN     "canApprove" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canReject" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canReturn" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ExpenseReportApproval" ADD COLUMN     "canApprove" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canReject" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canReturn" BOOLEAN NOT NULL DEFAULT true;
