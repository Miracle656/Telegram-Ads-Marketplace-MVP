# Quick Supabase Database Setup (Manual)

Since Prisma engines can't download due to network restrictions, we'll use Supabase's SQL Editor to create the database schema directly.

## Steps

### 1. Open Supabase SQL Editor

1. Go to your Supabase project: https://supabase.com/dashboard/project/nuwmwdapyavpncnhefbz
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### 2. Copy & Run the Schema

1. Open the file: **`supabase_schema.sql`** (in project root)
2. **Copy ALL the contents** (Ctrl+A, Ctrl+C)
3. **Paste into Supabase SQL Editor**
4. Click **"Run"** button (or press Ctrl+Enter)

### 3. Verify Tables Were Created

After running, you should see:
- ✅ Message: "Database schema created successfully!"
- Go to **Table Editor** in sidebar
- You should see 10 tables:
  - User
  - Channel
  - ChannelAdmin
  - ChannelAdFormat
  - Campaign
  - CampaignApplication
  - ChannelListing
  - Deal
  - Creative
  - Payment
  - Post

### 4. Update Prisma Client (Skip for Now)

Since we can't download Prisma engines locally, we'll use a workaround later. For now, the database is ready!

## ✅ What's Created

The SQL script creates:
- **All 10 tables** with proper relationships
- **5 enums** for type safety (Role, DealStatus, AdFormat, etc.)
- **Indexes** for query performance
- **Auto-update triggers** for `updatedAt` columns
- **Foreign key constraints** for data integrity

## Next Steps

After database is set up:

1. ✅ Database ready in Supabase
2. 🔄 Need Prisma Client (workaround below)
3. ⏳ Start backend server

## Workaround for Prisma Client

Since you can't generate Prisma client locally, you have 2 options:

### Option A: Use Raw SQL Queries (Quick Fix)
Temporarily use raw SQL instead of Prisma:
```typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

### Option B: Use a Different Machine
- Generate Prisma client on another computer (unrestricted network)
- Copy `node_modules/@prisma` and `node_modules/.prisma` folders
- Paste into your project

### Option C: Deploy & Test Remotely
- Deploy backend to Railway/Render (they'll generate Prisma client automatically)
- Test the application remotely

## Troubleshooting

**If you see errors in SQL Editor:**
- Most likely the tables exist already - that's okay!
- You can drop all tables and re-run, or just proceed

**To start fresh (if needed):**
```sql
DROP TABLE IF EXISTS "Post" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Creative" CASCADE;
DROP TABLE IF EXISTS "Deal" CASCADE;
DROP TABLE IF EXISTS "ChannelListing" CASCADE;
DROP TABLE IF EXISTS "CampaignApplication" CASCADE;
DROP TABLE IF EXISTS "Campaign" CASCADE;
DROP TABLE IF EXISTS "ChannelAdFormat" CASCADE;
DROP TABLE IF EXISTS "ChannelAdmin" CASCADE;
DROP TABLE IF EXISTS "Channel" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "CreativeStatus";
DROP TYPE IF EXISTS "PaymentStatus";
DROP TYPE IF EXISTS "AdFormat";
DROP TYPE IF EXISTS "DealStatus";
DROP TYPE IF EXISTS "Role";
```

Then run the schema again.

---

**Once you complete this, your database will be fully set up and ready to use!** 🎉
