-- AlterTable
ALTER TABLE "MarketplaceOrderPackage" ADD COLUMN     "cargoSenderNumber" TEXT,
ADD COLUMN     "cargoTrackingLink" TEXT,
ADD COLUMN     "externalCargoCompanyId" TEXT,
ADD COLUMN     "shipmentMethod" TEXT;
