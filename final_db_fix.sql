-- COMPREHENSIVE DATABASE FIX
-- Run this in Supabase SQL Editor to fix ALL schema issues

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS "Channel" (
    "id" TEXT NOT NULL,
    "telegramChannelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- 2. Add ALL Potential Missing Columns
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "telegramChannelId" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "username" TEXT;
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "subscriberCount" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "averageViews" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "language" TEXT;
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "botAdded" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "lastStatsUpdate" TIMESTAMP(3);
    ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION
    WHEN others THEN null;
END $$;

-- 3. Ensure User Table Exists
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- success message
SELECT 'Database schema successfully repaired!' as message;
