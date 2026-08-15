ALTER TABLE "Vendor"
ADD COLUMN "defaultCommissionActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "defaultCommissionEffectiveFrom" TIMESTAMP(3);
