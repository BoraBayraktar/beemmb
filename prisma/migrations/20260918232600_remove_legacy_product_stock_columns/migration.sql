-- DropIndex
DROP INDEX "public"."Product_stock_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock";

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "stockOverride";
