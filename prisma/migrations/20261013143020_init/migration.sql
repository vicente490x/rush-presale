-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "expiresAt" DATETIME,
    "orderStatus" TEXT NOT NULL DEFAULT 'RESERVED',
    "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
    "refundedAt" DATETIME,
    "confirmationSentAt" DATETIME,
    "expiryWarningSentAt" DATETIME,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'DA_CONSEGNARE',
    "termsAcceptedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "threshold" INTEGER NOT NULL DEFAULT 15,
    "presaleOpen" BOOLEAN NOT NULL DEFAULT true,
    "productionStatus" TEXT NOT NULL DEFAULT 'IN_RACCOLTA',
    "thresholdNotifiedAt" DATETIME,
    "tryOnEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tryOnDailyLimit" INTEGER NOT NULL DEFAULT 50,
    "tryOnDailyCount" INTEGER NOT NULL DEFAULT 0,
    "tryOnDailySpendUsd" REAL NOT NULL DEFAULT 0,
    "tryOnSpendResetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TryOnJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "provider" TEXT NOT NULL,
    "costEstimate" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RateLimitEntry" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemporaryTryOnAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dedupeKey" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

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
