# Supabase Setup Guide

This guide will help you set up Supabase as your database for the Telegram Ads Marketplace.

## Why Supabase?

✅ **Easiest Setup**: No local PostgreSQL installation needed  
✅ **Free Tier**: 500MB database, perfect for MVP  
✅ **Auto Backups**: Daily automatic backups included  
✅ **Built-in Dashboard**: View and manage data easily  
✅ **Connection Pooling**: Better performance for serverless  
✅ **PostgreSQL Compatible**: Works seamlessly with Prisma  

## Step-by-Step Setup

### 1. Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email

### 2. Create New Project

1. Click **"New Project"**
2. Choose your organization (or create one)
3. Fill in project details:
   - **Name**: `telegram-ads-marketplace` (or your choice)
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for MVP

4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

### 3. Get Database Connection String

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll to **Connection String** section
4. Select **"Connection pooling"** tab (recommended)
5. Copy the **URI** connection string

It should look like:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

⚠️ **Important**: Replace `[YOUR-PASSWORD]` with your actual database password

### 4. Configure Your Project

1. **Update `.env` file** in the project root:
   ```env
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

2. **Verify connection** (optional):
   ```bash
   cd backend
   npx prisma db pull
   ```
   This should connect successfully even if schema is empty.

### 5. Run Database Migrations

```bash
cd backend

# Deploy migrations to Supabase
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

You should see:
```
✔ Prisma Migrate applied the following migration(s):
  20240202_init (or similar timestamp)
```

### 6. Verify Setup

1. Go back to Supabase Dashboard
2. Click **Table Editor** in sidebar
3. You should see all your tables:
   - User
   - Channel
   - Campaign
   - Deal
   - Payment
   - Post
   - etc.

### 7. (Optional) Use Prisma Studio to View Data

```bash
cd backend
npx prisma studio
```

Opens at http://localhost:5555 - you can view and edit data here.

## Supabase Dashboard Features

### Table Editor
- View all your data in a spreadsheet-like interface
- Edit records directly
- Add/delete records manually for testing

### SQL Editor
- Run custom SQL queries
- Useful for debugging or data analysis

### Database → Backups
- Automatic daily backups (on paid plans)
- Point-in-time recovery

### Database → Roles
- Manage database users and permissions
- Default `postgres` role has full access

## Production Considerations

### Connection Pooling

The connection string you copied uses **PgBouncer** (port 6543), which is recommended for:
- Serverless deployments (Vercel, Netlify)
- High connection count scenarios
- Better performance under load

If you need direct connection (port 5432):
- Use for migrations only
- Available in "Session pooling" tab

### Environment-Specific Databases

For production setup:

1. **Create separate projects** for dev/staging/prod:
   - `telegram-ads-dev`
   - `telegram-ads-staging`
   - `telegram-ads-prod`

2. **Use different connection strings**:
   ```env
   # .env.development
   DATABASE_URL=postgresql://...dev-project...

   # .env.production
   DATABASE_URL=postgresql://...prod-project...
   ```

### Security Best Practices

1. **Never commit** `.env` file to Git
2. **Rotate database password** if accidentally exposed
3. **Use RLS** (Row Level Security) for additional protection:
   - Go to Authentication → Policies
   - Set up row-level policies

4. **Enable SSL** (already enabled by default in Supabase)

## Common Issues

### "Error: P1001: Can't reach database server"

**Solutions**:
- Check internet connection
- Verify DATABASE_URL is correct
- Ensure you replaced `[YOUR-PASSWORD]` with actual password
- Check Supabase project is running (not paused)

### "Error: Schema engine error"

**Solution**: You might be using session pooling instead of transaction pooling.

Change from:
```
...supabase.com:5432/postgres
```

To:
```
...supabase.com:6543/postgres?pgbouncer=true
```

### "Too many connections"

**Solution**: You're using direct connection (port 5432) with many requests.

Switch to connection pooling (port 6543) as shown above.

### Free Tier Limits Exceeded

Supabase Free Tier includes:
- 500 MB database space
- 2 GB bandwidth/month
- 50,000 monthly active users

If you exceed:
1. Upgrade to Pro ($25/month)
2. Or optimize your data (delete old records)

## Monitoring

### View Database Usage

1. Go to **Project Settings** → **Usage**
2. Monitor:
   - Database size
   - Bandwidth usage
   - API requests

### View Logs

1. Go to **Logs** in sidebar
2. Select **Postgres Logs**
3. See all database queries in real-time

## Backup & Restore

### Manual Backup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref [YOUR-PROJECT-REF]

# Backup
supabase db dump -f backup.sql
```

### Restore from Backup

```bash
supabase db reset
supabase db push backup.sql
```

## Migration from Local PostgreSQL

If you started with local PostgreSQL:

1. **Dump local database**:
   ```bash
   pg_dump telegram_ads_marketplace > local_backup.sql
   ```

2. **Apply to Supabase**:
   ```bash
   psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@...supabase.com:5432/postgres" < local_backup.sql
   ```

3. **Update .env** with Supabase connection string

4. **Test the application**

## Next Steps

After successful Supabase setup:

1. ✅ Start your backend: `cd backend && npm run dev`
2. ✅ Verify connection in logs
3. ✅ Create test data via API or Prisma Studio
4. ✅ Test the full application flow

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Prisma + Supabase Guide**: https://supabase.com/docs/guides/integrations/prisma

---

**You're all set!** Supabase handles all the database infrastructure so you can focus on building your app. 🚀
