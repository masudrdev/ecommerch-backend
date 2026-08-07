DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ReturnStatus'
  ) THEN
    CREATE TYPE "ReturnStatus" AS ENUM (
      'NONE',
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'IN_TRANSIT',
      'RECEIVED',
      'RESHIPPED',
      'RESOLVED'
    );
  END IF;
END
$$;

ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "returnStatus"
"ReturnStatus" NOT NULL DEFAULT 'NONE';

ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "deliveredAt"
TIMESTAMP(3);

ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "completedAt"
TIMESTAMP(3);

ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "returnRequestedAt"
TIMESTAMP(3);

ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "returnResolvedAt"
TIMESTAMP(3);