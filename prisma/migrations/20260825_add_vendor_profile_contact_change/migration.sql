ALTER TABLE "Vendor"
ADD COLUMN "officeAddress" TEXT,
ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "pendingPhone" TEXT,
ADD COLUMN "contactChangeCodeHash" TEXT,
ADD COLUMN "contactChangeExpiresAt" TIMESTAMP(3),
ADD COLUMN "contactChangeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "contactChangeLastSentAt" TIMESTAMP(3);