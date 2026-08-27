-- Faz 1 / Dalga 16: Katalog ailesinin kalani --
-- ProductAttributeDefinition, ProductAttributeLink,
-- ProductAttributeValueMarketplaceMapping, ProductVariantAttributeValue,
-- ProductInteraction, ProductQuestion, ProductReview, StorefrontItem
-- tenant-scoped hale getirilir. slug ve [attributeDefinitionId, channel,
-- localValue] tenant-composite unique kisitlara donusturulur; internal
-- FK-scoped join tablolari ([productId, attributeDefinitionId],
-- [productVariantId, attributeDefinitionId], ProductInteraction.productId)
-- degismez.

ALTER TABLE "ProductAttributeDefinition" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductAttributeDefinition" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductAttributeDefinition" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductAttributeDefinition" ADD CONSTRAINT "ProductAttributeDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductAttributeDefinition" DROP CONSTRAINT IF EXISTS "ProductAttributeDefinition_slug_key";
DROP INDEX IF EXISTS "ProductAttributeDefinition_slug_key";
CREATE UNIQUE INDEX "ProductAttributeDefinition_tenantId_slug_key" ON "ProductAttributeDefinition"("tenantId", "slug");

CREATE INDEX "ProductAttributeDefinition_tenantId_idx" ON "ProductAttributeDefinition"("tenantId");


ALTER TABLE "ProductAttributeLink" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductAttributeLink" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductAttributeLink" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductAttributeLink" ADD CONSTRAINT "ProductAttributeLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ProductAttributeLink_tenantId_idx" ON "ProductAttributeLink"("tenantId");


ALTER TABLE "ProductAttributeValueMarketplaceMapping" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductAttributeValueMarketplaceMapping" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductAttributeValueMarketplaceMapping" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductAttributeValueMarketplaceMapping" ADD CONSTRAINT "ProductAttributeValueMarketplaceMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductAttributeValueMarketplaceMapping" DROP CONSTRAINT IF EXISTS "ProductAttributeValueMarketplaceMapping_attributeDefinition_key";
DROP INDEX IF EXISTS "ProductAttributeValueMarketplaceMapping_attributeDefinition_key";
CREATE UNIQUE INDEX "ProductAttributeValueMarketplaceMapping_tenantId_attributeD_key" ON "ProductAttributeValueMarketplaceMapping"("tenantId", "attributeDefinitionId", "channel", "localValue");

CREATE INDEX "ProductAttributeValueMarketplaceMapping_tenantId_idx" ON "ProductAttributeValueMarketplaceMapping"("tenantId");


ALTER TABLE "ProductVariantAttributeValue" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductVariantAttributeValue" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductVariantAttributeValue" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductVariantAttributeValue" ADD CONSTRAINT "ProductVariantAttributeValue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ProductVariantAttributeValue_tenantId_idx" ON "ProductVariantAttributeValue"("tenantId");


ALTER TABLE "ProductInteraction" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductInteraction" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductInteraction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductInteraction" ADD CONSTRAINT "ProductInteraction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ProductInteraction_tenantId_idx" ON "ProductInteraction"("tenantId");


ALTER TABLE "ProductQuestion" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductQuestion" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductQuestion" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ProductQuestion_tenantId_idx" ON "ProductQuestion"("tenantId");


ALTER TABLE "ProductReview" ADD COLUMN "tenantId" TEXT;
UPDATE "ProductReview" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "ProductReview" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ProductReview_tenantId_idx" ON "ProductReview"("tenantId");


ALTER TABLE "StorefrontItem" ADD COLUMN "tenantId" TEXT;
UPDATE "StorefrontItem" SET "tenantId" = 'tenant-beemmb-platform' WHERE "tenantId" IS NULL;
ALTER TABLE "StorefrontItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "StorefrontItem" ADD CONSTRAINT "StorefrontItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "StorefrontItem_tenantId_idx" ON "StorefrontItem"("tenantId");
