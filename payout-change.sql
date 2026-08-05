-- AlterEnum
BEGIN;
CREATE TYPE "PayoutStatus_new" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');
ALTER TABLE "PayoutRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PayoutRequest" ALTER COLUMN "status" TYPE "PayoutStatus_new" USING ("status"::text::"PayoutStatus_new");
ALTER TYPE "PayoutStatus" RENAME TO "PayoutStatus_old";
ALTER TYPE "PayoutStatus_new" RENAME TO "PayoutStatus";
DROP TYPE "PayoutStatus_old";
ALTER TABLE "PayoutRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "PayoutRequest" DROP COLUMN "approvedById",
DROP COLUMN "bankName",
DROP COLUMN "branchName",
DROP COLUMN "processingAt",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "processedById" TEXT,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" TEXT NOT NULL;

-- DropEnum
DROP TYPE "PayoutMethod";
