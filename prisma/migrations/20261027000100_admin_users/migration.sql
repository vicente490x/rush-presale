-- Additive migration: existing orders, settings and sessions are preserved.
-- Old sessions without a credential fingerprint must log in again.
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');
CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
  "passwordHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
ALTER TABLE "AdminSession" ADD COLUMN "credentialHash" TEXT;
