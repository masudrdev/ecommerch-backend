ALTER TABLE "Product" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Product_archivedAt_idx" ON "Product"("archivedAt");
