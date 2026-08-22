-- DropForeignKey
ALTER TABLE "public"."PaymentRecord" DROP CONSTRAINT "PaymentRecord_supplierId_fkey";

-- AlterTable
ALTER TABLE "PaymentRecord" ALTER COLUMN "supplierId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
