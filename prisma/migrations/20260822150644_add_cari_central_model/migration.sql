-- AlterTable
ALTER TABLE "BusinessDocument" ADD COLUMN     "cariId" TEXT;

-- AlterTable
ALTER TABLE "CashTransaction" ADD COLUMN     "cariId" TEXT;

-- AlterTable
ALTER TABLE "FinanceAccountEntry" ADD COLUMN     "cariId" TEXT;

-- AlterTable
ALTER TABLE "IncomingInvoice" ADD COLUMN     "cariId" TEXT;

-- AlterTable
ALTER TABLE "NegotiableInstrument" ADD COLUMN     "cariId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cariId" TEXT,
ADD COLUMN     "carrierCariId" TEXT;

-- AlterTable
ALTER TABLE "PaymentRecord" ADD COLUMN     "cariId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "primaryCariId" TEXT;

-- CreateTable
CREATE TABLE "Cari" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "taxOffice" TEXT,
    "photoUrl" TEXT,
    "iban" TEXT,
    "bankName" TEXT,
    "bankAccountHolder" TEXT,
    "contactPersonName" TEXT,
    "contactPersonPhone" TEXT,
    "contactPersonEmail" TEXT,
    "address" TEXT,
    "note" TEXT,
    "defaultPaymentTermDays" INTEGER,
    "creditLimit" DECIMAL(12,2),
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "isCarrier" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "Cari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CariCarrierProfile" (
    "id" TEXT NOT NULL,
    "cariId" TEXT NOT NULL,
    "trackingUrlTemplate" TEXT,
    "externalCodeTrendyol" INTEGER,
    "externalCodePazarama" TEXT,
    "externalCodeHepsiburada" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CariCarrierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cari_slug_key" ON "Cari"("slug");

-- CreateIndex
CREATE INDEX "Cari_deleted_isActive_idx" ON "Cari"("deleted", "isActive");

-- CreateIndex
CREATE INDEX "Cari_isCustomer_idx" ON "Cari"("isCustomer");

-- CreateIndex
CREATE INDEX "Cari_isSupplier_idx" ON "Cari"("isSupplier");

-- CreateIndex
CREATE INDEX "Cari_isCarrier_idx" ON "Cari"("isCarrier");

-- CreateIndex
CREATE INDEX "Cari_taxNumber_idx" ON "Cari"("taxNumber");

-- CreateIndex
CREATE INDEX "Cari_email_idx" ON "Cari"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CariCarrierProfile_cariId_key" ON "CariCarrierProfile"("cariId");

-- CreateIndex
CREATE INDEX "BusinessDocument_cariId_idx" ON "BusinessDocument"("cariId");

-- CreateIndex
CREATE INDEX "CashTransaction_cariId_transactionAt_idx" ON "CashTransaction"("cariId", "transactionAt");

-- CreateIndex
CREATE INDEX "FinanceAccountEntry_cariId_idx" ON "FinanceAccountEntry"("cariId");

-- CreateIndex
CREATE INDEX "IncomingInvoice_cariId_idx" ON "IncomingInvoice"("cariId");

-- CreateIndex
CREATE INDEX "NegotiableInstrument_cariId_idx" ON "NegotiableInstrument"("cariId");

-- CreateIndex
CREATE INDEX "Order_cariId_idx" ON "Order"("cariId");

-- CreateIndex
CREATE INDEX "Order_carrierCariId_idx" ON "Order"("carrierCariId");

-- CreateIndex
CREATE INDEX "PaymentRecord_cariId_paidAt_idx" ON "PaymentRecord"("cariId", "paidAt");

-- CreateIndex
CREATE INDEX "Product_primaryCariId_idx" ON "Product"("primaryCariId");

-- AddForeignKey
ALTER TABLE "CariCarrierProfile" ADD CONSTRAINT "CariCarrierProfile_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiableInstrument" ADD CONSTRAINT "NegotiableInstrument_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryCariId_fkey" FOREIGN KEY ("primaryCariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_carrierCariId_fkey" FOREIGN KEY ("carrierCariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAccountEntry" ADD CONSTRAINT "FinanceAccountEntry_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingInvoice" ADD CONSTRAINT "IncomingInvoice_cariId_fkey" FOREIGN KEY ("cariId") REFERENCES "Cari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
