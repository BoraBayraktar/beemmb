-- AlterTable
ALTER TABLE "CustomerAccount" ADD COLUMN "defaultPaymentTermDays" INTEGER,
ADD COLUMN "creditLimit" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "defaultPaymentTermDays" INTEGER,
ADD COLUMN "creditLimit" DECIMAL(12,2);
