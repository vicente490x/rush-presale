-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutExpiresAt" TIMESTAMP(3),
ADD COLUMN     "checkoutFingerprint" TEXT,
ADD COLUMN     "checkoutKey" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'eur',
ADD COLUMN     "demoSeedId" TEXT,
ADD COLUMN     "refundMonths" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "termsSnapshot" TEXT,
ADD COLUMN     "termsVersionId" TEXT,
ADD COLUMN     "unitPriceCents" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN     "warningDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "adminRecipients" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "closedMessage" TEXT NOT NULL DEFAULT 'PRE-SALE CHIUSA',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'eur',
ADD COLUMN     "currentTermsId" TEXT,
ADD COLUMN     "deliveryText" TEXT NOT NULL DEFAULT 'La consegna avverrà durante una serata Rush oppure tramite uno dei nostri PR di fiducia.',
ADD COLUMN     "emailTemplates" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "maintenance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPerCustomer" INTEGER,
ADD COLUMN     "maxQuantity" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "productionCompletedAt" TIMESTAMP(3),
ADD COLUMN     "productionStartedAt" TIMESTAMP(3),
ADD COLUMN     "refundMonths" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sizes" JSONB NOT NULL DEFAULT '[{"size":"XS","enabled":true,"stock":null},{"size":"S","enabled":true,"stock":null},{"size":"M","enabled":true,"stock":null},{"size":"L","enabled":true,"stock":null},{"size":"XL","enabled":true,"stock":null},{"size":"XXL","enabled":true,"stock":null}]',
ADD COLUMN     "unitPriceCents" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN     "warningDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "EmailOutbox" ADD COLUMN     "firstAttemptAt" TIMESTAMP(3),
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "TermsVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "TermsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundOperation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "stripeRefundId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "automatic" BOOLEAN NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationError" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermsVersion_version_key" ON "TermsVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "RefundOperation_orderId_key" ON "RefundOperation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundOperation_idempotencyKey_key" ON "RefundOperation"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "RefundOperation_stripeRefundId_key" ON "RefundOperation"("stripeRefundId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApplicationError_createdAt_idx" ON "ApplicationError"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_termsVersionId_fkey" FOREIGN KEY ("termsVersionId") REFERENCES "TermsVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_currentTermsId_fkey" FOREIGN KEY ("currentTermsId") REFERENCES "TermsVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundOperation" ADD CONSTRAINT "RefundOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve historical monetary values; do not invent accepted terms for legacy orders.
UPDATE "Order" SET "unitPriceCents" = "amountCents" / "quantity" WHERE "quantity" > 0;
UPDATE "Order" SET "refundedAmountCents" = "amountCents" WHERE "refundStatus" = 'REFUNDED';
-- Legacy start time was not recorded: use last persisted settings update conservatively.
UPDATE "Settings" SET "productionStartedAt" = "updatedAt"
WHERE "productionStartedAt" IS NULL AND "productionStatus" IN ('PRODUZIONE_AVVIATA', 'PRODUZIONE_COMPLETATA');

-- NOT VALID preserves legacy rows while enforcing invariants on new/changed rows.
ALTER TABLE "Order" ADD CONSTRAINT "Order_positive_values" CHECK (
  "quantity" > 0 AND "unitPriceCents" > 0 AND "amountCents" > 0 AND "currency" = 'eur'
  AND "refundedAmountCents" >= 0 AND "refundedAmountCents" <= "amountCents"
  AND "refundMonths" BETWEEN 1 AND 24 AND "warningDays" > 0
) NOT VALID;
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_global_positive" CHECK (
  "id" = 'global' AND "threshold" > 0 AND "unitPriceCents" > 0 AND "currency" = 'eur'
  AND "maxQuantity" BETWEEN 1 AND 100 AND "refundMonths" BETWEEN 1 AND 24 AND "warningDays" > 0
) NOT VALID;

CREATE FUNCTION rush_production_monotonic() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."productionStartedAt" IS NOT NULL AND (
    NEW."productionStartedAt" IS DISTINCT FROM OLD."productionStartedAt"
    OR NEW."productionStatus" NOT IN ('PRODUZIONE_AVVIATA', 'PRODUZIONE_COMPLETATA')
  ) THEN RAISE EXCEPTION 'Production start is irreversible'; END IF;
  IF OLD."productionStatus" = 'PRODUZIONE_COMPLETATA' AND NEW."productionStatus" <> OLD."productionStatus"
    THEN RAISE EXCEPTION 'Completed production is irreversible'; END IF;
  IF NEW."productionStatus" IN ('PRODUZIONE_AVVIATA', 'PRODUZIONE_COMPLETATA') AND NEW."productionStartedAt" IS NULL
    THEN RAISE EXCEPTION 'Production start timestamp required'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rush_production_monotonic BEFORE UPDATE ON "Settings" FOR EACH ROW EXECUTE FUNCTION rush_production_monotonic();

-- Record verified deliveries separately from event-level idempotency (including failures/duplicates).
CREATE TABLE "WebhookReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT NOT NULL,
 "type" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'RECEIVED',
 "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "WebhookReceipt_receivedAt_idx" ON "WebhookReceipt"("receivedAt");

ALTER TABLE "Order" ADD COLUMN "deliveryTextSnapshot" TEXT;
