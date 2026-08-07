CREATE TYPE "FinanceTransactionType" AS ENUM (
  'ORDER_PAYMENT',
  'COMMISSION',
  'VENDOR_EARNING',
  'PAYOUT'
);

CREATE TYPE "FinanceTransactionStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "referenceId" TEXT,
    "description" TEXT,
    "vendorId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceTransaction_type_idx"
ON "FinanceTransaction"("type");

CREATE INDEX "FinanceTransaction_vendorId_idx"
ON "FinanceTransaction"("vendorId");

CREATE INDEX "FinanceTransaction_userId_idx"
ON "FinanceTransaction"("userId");

CREATE INDEX "FinanceTransaction_createdAt_idx"
ON "FinanceTransaction"("createdAt");

ALTER TABLE "FinanceTransaction"
ADD CONSTRAINT "FinanceTransaction_vendorId_fkey"
FOREIGN KEY ("vendorId")
REFERENCES "Vendor"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "FinanceTransaction"
ADD CONSTRAINT "FinanceTransaction_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;