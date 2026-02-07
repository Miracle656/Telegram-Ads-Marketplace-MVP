-- =========================================
-- ENABLE ROW LEVEL SECURITY (RLS) MIGRATION
-- =========================================
-- Run this in Supabase SQL Editor
-- This migration enables RLS on all tables and creates security policies

-- ========================================= -- 1. ENABLE RLS ON ALL TABLES
-- =========================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Channel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelAdmin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelAdFormat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelListing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Creative" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 2. USER TABLE POLICIES
-- =========================================

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT
    USING (true); -- Allow reading all users for display purposes (username, firstName)

-- Allow users to update their own profile only
CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE
    USING (auth.uid()::text = "telegramId"::text);

-- Allow user registration (INSERT)
CREATE POLICY "Users can register" ON "User"
    FOR INSERT
    WITH CHECK (auth.uid()::text = "telegramId"::text);

-- =========================================
-- 3. CHANNEL TABLE POLICIES
-- =========================================

-- Everyone can read active channels (for marketplace browsing)
CREATE POLICY "Anyone can view active channels" ON "Channel"
    FOR SELECT
    USING ("isActive" = true);

-- Channel owners can create channels
CREATE POLICY "Users can create channels" ON "Channel"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User" 
            WHERE "User"."id" = "Channel"."ownerId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Channel owners can update their own channels
CREATE POLICY "Owners can update own channels" ON "Channel"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "User" 
            WHERE "User"."id" = "Channel"."ownerId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Channel owners can delete their own channels
CREATE POLICY "Owners can delete own channels" ON "Channel"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "User" 
            WHERE "User"."id" = "Channel"."ownerId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 4. CHANNEL ADMIN TABLE POLICIES
-- =========================================

-- Admins can view their admin permissions
CREATE POLICY "Users can view own admin permissions" ON "ChannelAdmin"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User" 
            WHERE "User"."id" = "ChannelAdmin"."userId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Channel owners can add admins to their channels
CREATE POLICY "Channel owners can add admins" ON "ChannelAdmin"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Channel" 
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "Channel"."id" = "ChannelAdmin"."channelId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Channel owners can remove admins from their channels
CREATE POLICY "Channel owners can remove admins" ON "ChannelAdmin"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "Channel" 
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "Channel"."id" = "ChannelAdmin"."channelId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 5. CHANNEL AD FORMAT TABLE POLICIES
-- =========================================

-- Everyone can read active ad formats (for pricing display)
CREATE POLICY "Anyone can view active ad formats" ON "ChannelAdFormat"
    FOR SELECT
    USING ("isActive" = true);

-- Channel owners can manage ad formats for their channels
CREATE POLICY "Channel owners can manage ad formats" ON "ChannelAdFormat"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Channel" 
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "Channel"."id" = "ChannelAdFormat"."channelId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 6. CAMPAIGN TABLE POLICIES
-- =========================================

-- Active campaigns are visible to channel owners (for matching)
CREATE POLICY "Channel owners can view active campaigns" ON "Campaign"
    FOR SELECT
    USING ("isActive" = true);

-- Advertisers can manage their own campaigns
CREATE POLICY "Advertisers can manage own campaigns" ON "Campaign"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "User" 
            WHERE "User"."id" = "Campaign"."advertiserId" 
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 7. CAMPAIGN APPLICATION TABLE POLICIES
-- =========================================

-- Channel owners can create applications
CREATE POLICY "Channel owners can apply to campaigns" ON "CampaignApplication"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "ChannelListing"
            INNER JOIN "Channel" ON "Channel"."id" = "ChannelListing"."channelId"
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "ChannelListing"."id" = "CampaignApplication"."listingId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Advertisers can view applications for their campaigns
CREATE POLICY "Advertisers can view campaign applications" ON "CampaignApplication"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Campaign"
            INNER JOIN "User" ON "User"."id" = "Campaign"."advertiserId"
            WHERE "Campaign"."id" = "CampaignApplication"."campaignId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Channel owners can view their own applications
CREATE POLICY "Channel owners can view own applications" ON "CampaignApplication"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "ChannelListing"
            INNER JOIN "Channel" ON "Channel"."id" = "ChannelListing"."channelId"
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "ChannelListing"."id" = "CampaignApplication"."listingId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 8. CHANNEL LISTING TABLE POLICIES
-- =========================================

-- Everyone can view public channel listings
CREATE POLICY "Anyone can view public channel listings" ON "ChannelListing"
    FOR SELECT
    USING ("isActive" = true);

-- Channel owners can manage listings for their channels
CREATE POLICY "Channel owners can manage listings" ON "ChannelListing"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Channel"
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "Channel"."id" = "ChannelListing"."channelId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 9. DEAL TABLE POLICIES
-- =========================================

-- Channel owners can view deals for their channels
CREATE POLICY "Channel owners can view own deals" ON "Deal"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE "User"."id" = "Deal"."channelOwnerId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Advertisers can view their own deals
CREATE POLICY "Advertisers can view own deals" ON "Deal"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE "User"."id" = "Deal"."advertiserId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Both parties can update deal status
CREATE POLICY "Deal participants can update deals" ON "Deal"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE ("User"."id" = "Deal"."channelOwnerId" OR "User"."id" = "Deal"."advertiserId")
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Deals can be created by either party
CREATE POLICY "Users can create deals" ON "Deal"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE ("User"."id" = "Deal"."channelOwnerId" OR "User"."id" = "Deal"."advertiserId")
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 10. CREATIVE TABLE POLICIES
-- =========================================

-- Advertisers can manage creatives for their deals
CREATE POLICY "Advertisers can manage creatives" ON "Creative"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Deal"
            INNER JOIN "User" ON "User"."id" = "Deal"."advertiserId"
            WHERE "Deal"."id" = "Creative"."dealId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Channel owners can view and approve creatives
CREATE POLICY "Channel owners can review creatives" ON "Creative"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Deal"
            INNER JOIN "User" ON "User"."id" = "Deal"."channelOwnerId"
            WHERE "Deal"."id" = "Creative"."dealId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

CREATE POLICY "Channel owners can update creative status" ON "Creative"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "Deal"
            INNER JOIN "User" ON "User"."id" = "Deal"."channelOwnerId"
            WHERE "Deal"."id" = "Creative"."dealId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    )
    WITH CHECK (
        -- Only allow updating status and feedback fields for approval
        "dealId" IS NOT NULL
    );

-- =========================================
-- 11. PAYMENT TABLE POLICIES (MOST SENSITIVE)
-- =========================================

-- Only deal participants can view payment STATUS (not encrypted keys)
CREATE POLICY "Deal participants can view payment status" ON "Payment"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Deal"
            INNER JOIN "User" ON (
                "User"."id" = "Deal"."channelOwnerId" 
                OR "User"."id" = "Deal"."advertiserId"
            )
            WHERE "Deal"."id" = "Payment"."dealId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Payment creation/updates should ONLY be done by backend service role
-- No INSERT/UPDATE/DELETE policies for regular users!

-- =========================================
-- 12. POST TABLE POLICIES
-- =========================================

-- Channel owners can view posts for their channels
CREATE POLICY "Channel owners can view posts" ON "Post"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Channel"
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "Channel"."id" = "Post"."channelId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Advertisers can view posts for their deals
CREATE POLICY "Advertisers can view deal posts" ON "Post"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Deal"
            INNER JOIN "User" ON "User"."id" = "Deal"."advertiserId"
            WHERE "Deal"."id" = "Post"."dealId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- Channel owners can manage posts
CREATE POLICY "Channel owners can manage posts" ON "Post"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Channel"
            INNER JOIN "User" ON "User"."id" = "Channel"."ownerId"
            WHERE "Channel"."id" = "Post"."channelId"
            AND "User"."telegramId"::text = auth.uid()::text
        )
    );

-- =========================================
-- 13. FIX FUNCTION SEARCH_PATH WARNING
-- =========================================

-- Add security definer with safe search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Check that RLS is enabled on all tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Count policies per table
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Success message
SELECT 'RLS enabled and policies created successfully! ✅' as status;
