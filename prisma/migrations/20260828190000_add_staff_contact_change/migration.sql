CREATE TYPE "ContactChangePurpose" AS ENUM ('EMAIL_CHANGE', 'PHONE_CHANGE');

CREATE TABLE "StaffContactChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "ContactChangePurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "authorizationHash" TEXT,
    "authorizationExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffContactChange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffContactChange_userId_key" ON "StaffContactChange"("userId");
CREATE INDEX "StaffContactChange_expiresAt_idx" ON "StaffContactChange"("expiresAt");
ALTER TABLE "StaffContactChange" ADD CONSTRAINT "StaffContactChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;