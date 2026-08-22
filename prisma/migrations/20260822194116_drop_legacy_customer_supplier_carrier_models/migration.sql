-- DropForeignKey
ALTER TABLE "public"."BusinessDocument" DROP CONSTRAINT "BusinessDocument_customerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BusinessDocument" DROP CONSTRAINT "BusinessDocument_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CashTransaction" DROP CONSTRAINT "CashTransaction_customerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CashTransaction" DROP CONSTRAINT "CashTransaction_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FinanceAccountEntry" DROP CONSTRAINT "FinanceAccountEntry_customerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FinanceAccountEntry" DROP CONSTRAINT "FinanceAccountEntry_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."IncomingInvoice" DROP CONSTRAINT "IncomingInvoice_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NegotiableInstrument" DROP CONSTRAINT "NegotiableInstrument_customerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NegotiableInstrument" DROP CONSTRAINT "NegotiableInstrument_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_carrierCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_customerAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRecord" DROP CONSTRAINT "PaymentRecord_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_primarySupplierId_fkey";

-- DropIndex
DROP INDEX "public"."BusinessDocument_customerAccountId_idx";

-- DropIndex
DROP INDEX "public"."BusinessDocument_supplierId_idx";

-- DropIndex
DROP INDEX "public"."CashTransaction_customerAccountId_transactionAt_idx";

-- DropIndex
DROP INDEX "public"."CashTransaction_supplierId_transactionAt_idx";

-- DropIndex
DROP INDEX "public"."FinanceAccountEntry_customerAccountId_idx";

-- DropIndex
DROP INDEX "public"."FinanceAccountEntry_supplierId_idx";

-- DropIndex
DROP INDEX "public"."IncomingInvoice_supplierId_idx";

-- DropIndex
DROP INDEX "public"."NegotiableInstrument_customerAccountId_idx";

-- DropIndex
DROP INDEX "public"."NegotiableInstrument_supplierId_idx";

-- DropIndex
DROP INDEX "public"."Order_carrierCompanyId_idx";

-- DropIndex
DROP INDEX "public"."Order_customerAccountId_idx";

-- DropIndex
DROP INDEX "public"."PaymentRecord_supplierId_paidAt_idx";

-- DropIndex
DROP INDEX "public"."Product_primarySupplierId_idx";

-- AlterTable
ALTER TABLE "BusinessDocument" DROP COLUMN "customerAccountId",
DROP COLUMN "supplierId";

-- AlterTable
ALTER TABLE "CashTransaction" DROP COLUMN "customerAccountId",
DROP COLUMN "supplierId";

-- AlterTable
ALTER TABLE "FinanceAccountEntry" DROP COLUMN "customerAccountId",
DROP COLUMN "supplierId";

-- AlterTable
ALTER TABLE "IncomingInvoice" DROP COLUMN "supplierId";

-- AlterTable
ALTER TABLE "NegotiableInstrument" DROP COLUMN "customerAccountId",
DROP COLUMN "supplierId";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "carrierCompanyId",
DROP COLUMN "customerAccountId";

-- AlterTable
ALTER TABLE "PaymentRecord" DROP COLUMN "supplierId";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "primarySupplierId";

-- DropTable
DROP TABLE "public"."CarrierCompany";

-- DropTable
DROP TABLE "public"."CustomerAccount";

-- DropTable
DROP TABLE "public"."Supplier";
