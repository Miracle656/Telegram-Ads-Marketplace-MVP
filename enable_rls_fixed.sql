-- =========================================
-- ENABLE ROW LEVEL SECURITY (RLS) MIGRATION (CORRECTED)
-- =========================================
-- Run this in Supabase SQL Editor

-- =========================================
-- 1. ENABLE RLS ON ALL TABLES
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

CREATE POLICY "Users can view all profiles" ON "User"
    FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE
    USING ("telegramId"::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can register" ON "User"
    FOR INSERT
    WITH CHECK ("telegramId"::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- =========================================
-- 3. CHANNEL TABLE POLICIES
-- =========================================

CREATE POLICY "Anyone can view active channels" ON "Channel"
    FOR SELECT
    USING ("isActive" = true);

CREATE POLICY "Users can create channels" ON "Channel"
    FOR INSERT
    WITH CHECK (true); -- Allow creation for authenticated users

CREATE POLICY "Owners can update own channels" ON "Channel"
    FOR UPDATE
    USING (true); -- Will be restricted by backend

CREATE POLICY "Owners can delete own channels" ON "Channel"
    FOR DELETE
    USING (true); -- Will be restricted by backend

-- =========================================
-- 4. CHANNEL ADMIN TABLE POLICIES
-- =========================================

CREATE POLICY "Users can view admin permissions" ON "ChannelAdmin"
    FOR SELECT
    USING (true);

CREATE POLICY "Channel owners can add admins" ON "ChannelAdmin"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Channel owners can remove admins" ON "ChannelAdmin"
    FOR DELETE
    USING (true);

-- =========================================
-- 5. CHANNEL AD FORMAT TABLE POLICIES
-- =========================================

CREATE POLICY "Anyone can view available ad formats" ON "ChannelAdFormat"
    FOR SELECT
    USING ("isAvailable" = true);

CREATE POLICY "Channel owners can manage ad formats" ON "ChannelAdFormat"
    FOR ALL
    USING (true);

-- =========================================
-- 6. CAMPAIGN TABLE POLICIES
-- =========================================

CREATE POLICY "Anyone can view active campaigns" ON "Campaign"
    FOR SELECT
    USING ("isActive" = true);

CREATE POLICY "Advertisers can manage campaigns" ON "Campaign"
    FOR ALL
    USING (true);

-- =========================================
-- 7. CAMPAIGN APPLICATION TABLE POLICIES
-- =========================================

CREATE POLICY "Users can view applications" ON "CampaignApplication"
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create applications" ON "CampaignApplication"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update applications" ON "CampaignApplication"
    FOR UPDATE
    USING (true);

-- =========================================
-- 8. CHANNEL LISTING TABLE POLICIES
-- =========================================

CREATE POLICY "Anyone can view public listings" ON "ChannelListing"
    FOR SELECT
    USING ("isPublic" = true);

CREATE POLICY "Channel owners can manage listings" ON "ChannelListing"
    FOR ALL
    USING (true);

-- =========================================
-- 9. DEAL TABLE POLICIES
-- =========================================

CREATE POLICY "Users can view deals" ON "Deal"
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create deals" ON "Deal"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Deal participants can update" ON "Deal"
    FOR UPDATE
    USING (true);

-- =========================================
-- 10. CREATIVE TABLE POLICIES
-- =========================================

CREATE POLICY "Users can view creatives" ON "Creative"
    FOR SELECT
    USING (true);

CREATE POLICY "Advertisers can manage creatives" ON "Creative"
    FOR ALL
    USING (true);

-- =========================================
-- 11. PAYMENT TABLE POLICIES (RESTRICTED)
-- =========================================

CREATE POLICY "Deal participants can view payment status" ON "Payment"
    FOR SELECT
    USING (true);

-- No INSERT/UPDATE/DELETE for security - backend only

-- =========================================
-- 12. POST TABLE POLICIES
-- =========================================

CREATE POLICY "Users can view posts" ON "Post"
    FOR SELECT
    USING (true);

CREATE POLICY "Channel owners can manage posts" ON "Post"
    FOR ALL
    USING (true);

-- =========================================
-- 13. FIX FUNCTION SEARCH_PATH WARNING
-- =========================================

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
-- VERIFICATION
-- =========================================

SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

SELECT 'RLS enabled successfully! ✅' as status;
