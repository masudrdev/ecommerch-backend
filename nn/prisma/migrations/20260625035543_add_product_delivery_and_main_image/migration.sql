-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false;
