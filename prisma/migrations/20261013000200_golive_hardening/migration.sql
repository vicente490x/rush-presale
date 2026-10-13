-- Admin accounts are provisioned explicitly by the create-admin command.
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

ALTER TABLE "Order" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TryOnJob" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ALTER COLUMN "presaleOpen" SET DEFAULT false;
