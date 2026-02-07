-- Telegram Ads Marketplace Database Schema
-- Run this in Supabase SQL Editor to create/update all tables

-- Create ENUMs
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('CHANNEL_OWNER', 'ADVERTISER', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DealStatus" AS ENUM ('NEGOTIATING', 'AWAITING_PAYMENT', 'PAYMENT_RECEIVED', 'CREATIVE_PENDING', 'CREATIVE_REVIEW', 'CREATIVE_APPROVED', 'SCHEDULED', 'POSTED', 'VERIFYING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AdFormat" AS ENUM ('POST', 'FORWARD', 'REPOST', 'STORY', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CreativeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");
CREATE INDEX IF NOT EXISTS "User_telegramId_idx" ON "User"("telegramId");

-- Create Channel table
CREATE TABLE IF NOT EXISTS "Channel" (
    "id" TEXT NOT NULL,
    "telegramChannelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "description" TEXT,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "averageViews" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "botAdded" BOOLEAN NOT NULL DEFAULT false,
    "lastStatsUpdate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Channel_telegramChannelId_key" ON "Channel"("telegramChannelId");
CREATE INDEX IF NOT EXISTS "Channel_ownerId_idx" ON "Channel"("ownerId");
CREATE INDEX IF NOT EXISTS "Channel_telegramChannelId_idx" ON "Channel"("telegramChannelId");

-- Add telegramChannelId column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "Channel" ADD COLUMN "telegramChannelId" TEXT NOT NULL DEFAULT '';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create ChannelAdmin table
CREATE TABLE IF NOT EXISTS "ChannelAdmin" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canPost" BOOLEAN NOT NULL DEFAULT true,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChannelAdmin_channelId_userId_key" ON "ChannelAdmin"("channelId", "userId");
CREATE INDEX IF NOT EXISTS "ChannelAdmin_userId_idx" ON "ChannelAdmin"("userId");

-- Create ChannelAdFormat table
CREATE TABLE IF NOT EXISTS "ChannelAdFormat" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "format" "AdFormat" NOT NULL,
    "customName" TEXT,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelAdFormat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChannelAdFormat_channelId_idx" ON "ChannelAdFormat"("channelId");

-- Create Campaign table
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "targetFormats" "AdFormat"[],
    "budget" INTEGER NOT NULL,
    "minSubscribers" INTEGER,
    "minViews" INTEGER,
    "preferredLanguage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "advertiserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");

-- Create ChannelListing table
CREATE TABLE IF NOT EXISTS "ChannelListing" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelListing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChannelListing_channelId_idx" ON "ChannelListing"("channelId");

-- Create CampaignApplication table
CREATE TABLE IF NOT EXISTS "CampaignApplication" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CampaignApplication_campaignId_idx" ON "CampaignApplication"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignApplication_listingId_idx" ON "CampaignApplication"("listingId");

-- Create Deal table
CREATE TABLE IF NOT EXISTS "Deal" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelOwnerId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "campaignId" TEXT,
    "listingId" TEXT,
    "adFormatType" "AdFormat" NOT NULL,
    "customFormatName" TEXT,
    "agreedPrice" INTEGER NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'NEGOTIATING',
    "scheduledPostTime" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Deal_channelOwnerId_idx" ON "Deal"("channelOwnerId");
CREATE INDEX IF NOT EXISTS "Deal_advertiserId_idx" ON "Deal"("advertiserId");
CREATE INDEX IF NOT EXISTS "Deal_status_idx" ON "Deal"("status");
CREATE INDEX IF NOT EXISTS "Deal_lastActivityAt_idx" ON "Deal"("lastActivityAt");

-- Create Creative table
CREATE TABLE IF NOT EXISTS "Creative" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "status" "CreativeStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Creative_dealId_idx" ON "Creative"("dealId");
CREATE INDEX IF NOT EXISTS "Creative_status_idx" ON "Creative"("status");

-- Create Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "escrowWallet" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentAddress" TEXT,
    "transactionHash" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "isRefunded" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_dealId_key" ON "Payment"("dealId");
CREATE INDEX IF NOT EXISTS "Payment_dealId_idx" ON "Payment"("dealId");
CREATE INDEX IF NOT EXISTS "Payment_isPaid_idx" ON "Payment"("isPaid");

-- Create Post table
CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "telegramMessageId" INTEGER NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "verifiedUntil" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Post_dealId_key" ON "Post"("dealId");
CREATE INDEX IF NOT EXISTS "Post_dealId_idx" ON "Post"("dealId");
CREATE INDEX IF NOT EXISTS "Post_channelId_idx" ON "Post"("channelId");
CREATE INDEX IF NOT EXISTS "Post_verifiedUntil_idx" ON "Post"("verifiedUntil");

-- Add Foreign Keys (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE "Channel" ADD CONSTRAINT "Channel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ChannelAdmin" ADD CONSTRAINT "ChannelAdmin_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ChannelAdmin" ADD CONSTRAINT "ChannelAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ChannelAdFormat" ADD CONSTRAINT "ChannelAdFormat_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ChannelListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_channelOwnerId_fkey" FOREIGN KEY ("channelOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ChannelListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Creative" ADD CONSTRAINT "Creative_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Success message
SELECT 'Database schema created/updated successfully!' as message;
