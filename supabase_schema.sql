-- Telegram Ads Marketplace Database Schema
-- Run this directly in Supabase SQL Editor

-- Create enums
CREATE TYPE "Role" AS ENUM ('CHANNEL_OWNER', 'ADVERTISER', 'BOTH');
CREATE TYPE "DealStatus" AS ENUM (
    'NEGOTIATING',
    'AWAITING_PAYMENT',
    'PAYMENT_RECEIVED',
    'CREATIVE_PENDING',
    'CREATIVE_REVIEW',
    'CREATIVE_APPROVED',
    'SCHEDULED',
    'POSTED',
    'VERIFYING',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED'
);
CREATE TYPE "AdFormat" AS ENUM ('POST', 'FORWARD', 'REPOST', 'STORY', 'CUSTOM');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'RECEIVED', 'RELEASED', 'REFUNDED');
CREATE TYPE "CreativeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED');

-- User table
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "telegramId" BIGINT NOT NULL UNIQUE,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADVERTISER',
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Channel table
CREATE TABLE "Channel" (
    "id" SERIAL PRIMARY KEY,
    "telegramId" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "description" TEXT,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "averageViews" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "botIsAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastVerified" TIMESTAMP(3),
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Channel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ChannelAdmin table
CREATE TABLE "ChannelAdmin" (
    "id" SERIAL PRIMARY KEY,
    "channelId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "canPost" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelAdmin_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE,
    CONSTRAINT "ChannelAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "ChannelAdmin_channelId_userId_key" UNIQUE ("channelId", "userId")
);

-- ChannelAdFormat table
CREATE TABLE "ChannelAdFormat" (
    "id" SERIAL PRIMARY KEY,
    "channelId" INTEGER NOT NULL,
    "format" "AdFormat" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelAdFormat_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE,
    CONSTRAINT "ChannelAdFormat_channelId_format_key" UNIQUE ("channelId", "format")
);

-- Campaign table
CREATE TABLE "Campaign" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "targetAudience" TEXT,
    "preferredFormats" "AdFormat"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "advertiserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CampaignApplication table
CREATE TABLE "CampaignApplication" (
    "id" SERIAL PRIMARY KEY,
    "campaignId" INTEGER NOT NULL,
    "channelId" INTEGER NOT NULL,
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE,
    CONSTRAINT "CampaignApplication_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE,
    CONSTRAINT "CampaignApplication_campaignId_channelId_key" UNIQUE ("campaignId", "channelId")
);

-- ChannelListing table
CREATE TABLE "ChannelListing" (
    "id" SERIAL PRIMARY KEY,
    "channelId" INTEGER NOT NULL UNIQUE,
    "minBudget" DOUBLE PRECISION,
    "targetNiches" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelListing_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE
);

-- Deal table
CREATE TABLE "Deal" (
    "id" SERIAL PRIMARY KEY,
    "channelId" INTEGER NOT NULL,
    "advertiserId" INTEGER NOT NULL,
    "channelOwnerId" INTEGER NOT NULL,
    "campaignId" INTEGER,
    "status" "DealStatus" NOT NULL DEFAULT 'NEGOTIATING',
    "agreedPrice" DOUBLE PRECISION NOT NULL,
    "adFormat" "AdFormat" NOT NULL,
    "brief" TEXT,
    "scheduledPostTime" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deal_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT,
    CONSTRAINT "Deal_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE RESTRICT,
    CONSTRAINT "Deal_channelOwnerId_fkey" FOREIGN KEY ("channelOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT,
    CONSTRAINT "Deal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL
);

-- Creative table
CREATE TABLE "Creative" (
    "id" SERIAL PRIMARY KEY,
    "dealId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "CreativeStatus" NOT NULL DEFAULT 'DRAFT',
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Creative_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE
);

-- Payment table
CREATE TABLE "Payment" (
    "id" SERIAL PRIMARY KEY,
    "dealId" INTEGER NOT NULL UNIQUE,
    "amount" DOUBLE PRECISION NOT NULL,
    "escrowWallet" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE
);

-- Post table
CREATE TABLE "Post" (
    "id" SERIAL PRIMARY KEY,
    "dealId" INTEGER NOT NULL UNIQUE,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStartedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "lastChecked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");
CREATE INDEX "Channel_ownerId_idx" ON "Channel"("ownerId");
CREATE INDEX "Channel_telegramId_idx" ON "Channel"("telegramId");
CREATE INDEX "ChannelAdmin_channelId_idx" ON "ChannelAdmin"("channelId");
CREATE INDEX "ChannelAdmin_userId_idx" ON "ChannelAdmin"("userId");
CREATE INDEX "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");
CREATE INDEX "Deal_channelId_idx" ON "Deal"("channelId");
CREATE INDEX "Deal_advertiserId_idx" ON "Deal"("advertiserId");
CREATE INDEX "Deal_channelOwnerId_idx" ON "Deal"("channelOwnerId");
CREATE INDEX "Deal_status_idx" ON "Deal"("status");
CREATE INDEX "Creative_dealId_idx" ON "Creative"("dealId");
CREATE INDEX "Payment_dealId_idx" ON "Payment"("dealId");
CREATE INDEX "Post_dealId_idx" ON "Post"("dealId");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to auto-update updatedAt
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channel_updated_at BEFORE UPDATE ON "Channel" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channeladformat_updated_at BEFORE UPDATE ON "ChannelAdFormat" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_updated_at BEFORE UPDATE ON "Campaign" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaignapplication_updated_at BEFORE UPDATE ON "CampaignApplication" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channellisting_updated_at BEFORE UPDATE ON "ChannelListing" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deal_updated_at BEFORE UPDATE ON "Deal" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creative_updated_at BEFORE UPDATE ON "Creative" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_updated_at BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_updated_at BEFORE UPDATE ON "Post" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database schema created successfully!' as message;
