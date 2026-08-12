-- DropForeignKey
ALTER TABLE "public"."BusinessDocumentXmlArtifact" DROP CONSTRAINT "BusinessDocumentXmlArtifact_supersedesArtifactId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryItem" DROP CONSTRAINT "InventoryItem_productId_fkey";

-- DropIndex
DROP INDEX "public"."IntegrationSyncJob_externalReference_idx";

-- AlterTable
ALTER TABLE "FinanceLedgerAccount" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedDate" TIMESTAMP(3),
ADD COLUMN     "deletedUserId" TEXT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedDate" TIMESTAMP(3),
ADD COLUMN     "deletedUserId" TEXT;

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedDate" TIMESTAMP(3),
ADD COLUMN     "deletedUserId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseReceipt" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedDate" TIMESTAMP(3),
ADD COLUMN     "deletedUserId" TEXT;

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedDate" TIMESTAMP(3),
ADD COLUMN     "deletedUserId" TEXT;

-- CreateIndex
CREATE INDEX "FinanceLedgerAccount_deleted_idx" ON "FinanceLedgerAccount"("deleted");

-- CreateIndex
CREATE INDEX "InventoryItem_deleted_idx" ON "InventoryItem"("deleted");

-- CreateIndex
CREATE INDEX "Permission_deleted_idx" ON "Permission"("deleted");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_deleted_idx" ON "PurchaseReceipt"("deleted");

-- CreateIndex
CREATE INDEX "Warehouse_deleted_idx" ON "Warehouse"("deleted");

-- RenameForeignKey
ALTER TABLE "ProductAttributeValueMarketplaceMapping" RENAME CONSTRAINT "ProductAttributeValueMarketplaceMapping_attributeDefinitionId_f" TO "ProductAttributeValueMarketplaceMapping_attributeDefinitio_fkey";

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "BusinessDocumentIntegrationMessage_businessDocumentId_occurredA" RENAME TO "BusinessDocumentIntegrationMessage_businessDocumentId_occur_idx";

-- RenameIndex
ALTER INDEX "BusinessDocumentLifecycleEvent_businessDocumentId_occurredAt_id" RENAME TO "BusinessDocumentLifecycleEvent_businessDocumentId_occurredA_idx";

-- RenameIndex
ALTER INDEX "CollectionRecord_onlineCollectionProvider_onlineCollectionExter" RENAME TO "CollectionRecord_onlineCollectionProvider_onlineCollectionE_key";

-- RenameIndex
ALTER INDEX "ProductAttributeValueMarketplaceMapping_attributeDefinitionId_c" RENAME TO "ProductAttributeValueMarketplaceMapping_attributeDefinition_key";

-- RenameIndex
ALTER INDEX "ProductAttributeValueMarketplaceMapping_attributeDefinitionId_d" RENAME TO "ProductAttributeValueMarketplaceMapping_attributeDefinition_idx";

-- RenameIndex
ALTER INDEX "ProductAttributeValueMarketplaceMapping_channel_deleted_isActiv" RENAME TO "ProductAttributeValueMarketplaceMapping_channel_deleted_isA_idx";
