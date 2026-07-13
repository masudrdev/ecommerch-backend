-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "commissionAmount" DOUBLE PRECISION,
ADD COLUMN     "commissionType" "CommissionType",
ADD COLUMN     "commissionValue" DOUBLE PRECISION,
ADD COLUMN     "platformEarning" DOUBLE PRECISION,
ADD COLUMN     "vendorEarning" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "commissionType" "CommissionType",
ADD COLUMN     "commissionValue" DOUBLE PRECISION,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "defaultCommissionType" "CommissionType",
ADD COLUMN     "defaultCommissionValue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "defaultCommissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "defaultCommissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- CreateIndex
CREATE INDEX "Product_approvedById_idx"
ON "Product"("approvedById");