-- CreateEnum
CREATE TYPE "OrderShipmentStatus" AS ENUM ('NOT_SHIPPED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'RETURNED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cargoDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "cargoShippedAt" TIMESTAMP(3),
ADD COLUMN     "cargoTrackingNumber" TEXT,
ADD COLUMN     "carrierCompanyId" TEXT,
ADD COLUMN     "externalCarrierNameRaw" TEXT,
ADD COLUMN     "invoiceAddressLine" TEXT,
ADD COLUMN     "invoiceCity" TEXT,
ADD COLUMN     "invoiceDistrict" TEXT,
ADD COLUMN     "invoicePostalCode" TEXT,
ADD COLUMN     "shipmentAddressLine" TEXT,
ADD COLUMN     "shipmentCity" TEXT,
ADD COLUMN     "shipmentContactName" TEXT,
ADD COLUMN     "shipmentContactPhone" TEXT,
ADD COLUMN     "shipmentCountry" TEXT DEFAULT 'TR',
ADD COLUMN     "shipmentDistrict" TEXT,
ADD COLUMN     "shipmentPostalCode" TEXT,
ADD COLUMN     "shipmentSourceChannel" TEXT,
ADD COLUMN     "shipmentStatus" "OrderShipmentStatus" NOT NULL DEFAULT 'NOT_SHIPPED';

-- CreateTable
CREATE TABLE "CarrierCompany" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxNumber" TEXT,
    "trackingUrlTemplate" TEXT,
    "externalCodeTrendyol" INTEGER,
    "externalCodePazarama" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "CarrierCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarrierCompany_slug_key" ON "CarrierCompany"("slug");

-- CreateIndex
CREATE INDEX "CarrierCompany_deleted_isActive_idx" ON "CarrierCompany"("deleted", "isActive");

-- CreateIndex
CREATE INDEX "Order_carrierCompanyId_idx" ON "Order"("carrierCompanyId");

-- CreateIndex
CREATE INDEX "Order_shipmentStatus_idx" ON "Order"("shipmentStatus");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "CarrierCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
