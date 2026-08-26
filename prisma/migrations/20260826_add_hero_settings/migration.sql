CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imagePublicId" TEXT,
    "primaryButtonText" TEXT NOT NULL,
    "primaryButtonUrl" TEXT NOT NULL,
    "secondaryButtonText" TEXT,
    "secondaryButtonUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HeroSlide_isActive_displayOrder_idx" ON "HeroSlide"("isActive", "displayOrder");
CREATE INDEX "HeroSlide_displayOrder_idx" ON "HeroSlide"("displayOrder");

ALTER TABLE "PlatformSetting"
ADD COLUMN "heroAutoSlide" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "heroIntervalMs" INTEGER NOT NULL DEFAULT 5000;