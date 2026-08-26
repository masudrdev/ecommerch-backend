ALTER TABLE "Vendor"
ADD COLUMN "officeDistrict" TEXT,
ADD COLUMN "officeUpazila" TEXT,
ADD COLUMN "officeVillage" TEXT;

UPDATE "Vendor"
SET "officeVillage" = "officeAddress"
WHERE "officeVillage" IS NULL AND "officeAddress" IS NOT NULL;
