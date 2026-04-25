CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "GiftStatus" AS ENUM ('ACTIVE', 'RESERVED', 'PURCHASED', 'HIDDEN', 'ARCHIVED');
CREATE TYPE "GiftPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ReservationAction" AS ENUM ('RESERVED', 'CANCELLED_BY_USER', 'RELEASED_BY_ADMIN', 'MARKED_PURCHASED', 'MARKED_ACTIVE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "telegramId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "photoUrl" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Gift" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "linkUrl" TEXT,
  "price" DECIMAL(12,2),
  "currency" TEXT,
  "priority" "GiftPriority",
  "status" "GiftStatus" NOT NULL DEFAULT 'ACTIVE',
  "reservedByUserId" TEXT,
  "reservedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReservationHistory" (
  "id" TEXT NOT NULL,
  "giftId" TEXT NOT NULL,
  "userId" TEXT,
  "action" "ReservationAction" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReservationHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE INDEX "Gift_status_idx" ON "Gift"("status");
CREATE INDEX "Gift_reservedByUserId_idx" ON "Gift"("reservedByUserId");
CREATE INDEX "Gift_createdAt_idx" ON "Gift"("createdAt");
CREATE INDEX "ReservationHistory_giftId_idx" ON "ReservationHistory"("giftId");
CREATE INDEX "ReservationHistory_userId_idx" ON "ReservationHistory"("userId");
CREATE INDEX "ReservationHistory_createdAt_idx" ON "ReservationHistory"("createdAt");

ALTER TABLE "Gift"
  ADD CONSTRAINT "Gift_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Gift"
  ADD CONSTRAINT "Gift_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReservationHistory"
  ADD CONSTRAINT "ReservationHistory_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationHistory"
  ADD CONSTRAINT "ReservationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
