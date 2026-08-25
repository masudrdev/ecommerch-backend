CREATE TABLE "PageContent" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PageContent_key_key" ON "PageContent"("key");
CREATE INDEX "PageContent_key_idx" ON "PageContent"("key");
CREATE INDEX "PageContent_updatedAt_idx" ON "PageContent"("updatedAt");