-- Additive: existing signed admin cookies intentionally require a fresh login.
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
