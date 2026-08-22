ALTER TABLE "SupportTicket"
ADD COLUMN "productId" TEXT,
ADD COLUMN "paymentTransactionId" TEXT,
ADD COLUMN "withdrawalId" TEXT;
CREATE INDEX "SupportTicket_orderId_idx" ON "SupportTicket"("orderId");
CREATE INDEX "SupportTicket_productId_idx" ON "SupportTicket"("productId");
CREATE INDEX "SupportTicket_paymentTransactionId_idx" ON "SupportTicket"("paymentTransactionId");
CREATE INDEX "SupportTicket_withdrawalId_idx" ON "SupportTicket"("withdrawalId");