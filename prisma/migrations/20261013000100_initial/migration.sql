-- CreateEnum
CREATE TYPE "ClothingSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'PENDING', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DA_CONSEGNARE', 'SERATA_RUSH', 'PR', 'CONSEGNATA');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('IN_RACCOLTA', 'SOGLIA_RAGGIUNTA', 'PRODUZIONE_AVVIATA', 'PRODUZIONE_COMPLETATA');

-- CreateEnum
CREATE TYPE "TryOnStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "size" "ClothingSize" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'RESERVED',
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
    "refundedAt" TIMESTAMP(3),
    "confirmationSentAt" TIMESTAMP(3),
    "expiryWarningSentAt" TIMESTAMP(3),
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'DA_CONSEGNARE',
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "threshold" INTEGER NOT NULL DEFAULT 15,
    "presaleOpen" BOOLEAN NOT NULL DEFAULT true,
    "productionStatus" "ProductionStatus" NOT NULL DEFAULT 'IN_RACCOLTA',
    "thresholdNotifiedAt" TIMESTAMP(3),
    "tryOnEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tryOnDailyLimit" INTEGER NOT NULL DEFAULT 50,
    "tryOnDailyCount" INTEGER NOT NULL DEFAULT 0,
    "tryOnDailySpendUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "tryOnSpendResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TryOnJob" (
    "id" TEXT NOT NULL,
    "status" "TryOnStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "provider" TEXT NOT NULL,
    "costEstimate" DECIMAL(10,4) NOT NULL DEFAULT 0,

    CONSTRAINT "TryOnJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitEntry" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TemporaryTryOnAsset" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryTryOnAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_refundStatus_idx" ON "Order"("paymentStatus", "refundStatus");

-- CreateIndex
CREATE INDEX "Order_expiresAt_refundStatus_idx" ON "Order"("expiresAt", "refundStatus");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- CreateIndex
CREATE INDEX "TryOnJob_createdAt_status_idx" ON "TryOnJob"("createdAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryTryOnAsset_path_key" ON "TemporaryTryOnAsset"("path");

-- CreateIndex
CREATE INDEX "TemporaryTryOnAsset_expiresAt_idx" ON "TemporaryTryOnAsset"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_dedupeKey_key" ON "EmailOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailOutbox_sentAt_createdAt_idx" ON "EmailOutbox"("sentAt", "createdAt");
