ALTER TABLE "Vendor"
RENAME COLUMN "contactChangeCodeHash" TO "contactChangeCode";

UPDATE "Vendor"
SET "pendingEmail" = NULL,
    "pendingPhone" = NULL,
    "contactChangeCode" = NULL,
    "contactChangeExpiresAt" = NULL,
    "contactChangeAttempts" = 0,
    "contactChangeLastSentAt" = NULL
WHERE "contactChangeCode" IS NOT NULL;