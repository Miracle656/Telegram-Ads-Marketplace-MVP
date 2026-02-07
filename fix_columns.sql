-- Fix Missing Columns in Channel Table
-- Run this in Supabase SQL Editor

-- 1. Add isPremium
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Add botAdded
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "botAdded" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. Add lastStatsUpdate
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "lastStatsUpdate" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. Add language
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "language" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. Add subscriberCount (just in case)
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "subscriberCount" INTEGER NOT NULL DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 6. Add averageViews (just in case)
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "averageViews" INTEGER NOT NULL DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 7. Add isActive (just in case)
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

SELECT 'Schema fixed! Missing columns added.' as message;
