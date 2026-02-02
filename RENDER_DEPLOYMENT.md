# Render Deployment Guide

## Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Render Account** - Sign up at https://render.com (free)
3. **Supabase Database** - Already set up ✅

## Step 1: Push Code to GitHub

If you haven't already:

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Telegram Ads Marketplace"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

## Step 2: Create Render Account

1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended for easy deployment)

## Step 3: Create New Web Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Grant Render access to the repository

## Step 4: Configure Service

**Basic Settings:**
- **Name**: `telegram-ads-backend`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: 
  ```
  npm install && npx prisma generate && npm run build
  ```
- **Start Command**: 
  ```
  npm start
  ```
- **Plan**: **Free** (select this!)

## Step 5: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these (copy from your `.env` file):

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres:SV$vRyrbfExLzV2@db.nuwmwdapyavpncnhefbz.supabase.co:6543/postgres?pgbouncer=true
TELEGRAM_BOT_TOKEN=8416742710:AAE7Mcqv7CJ4L4r1iQRWQn2npBUxh9cE3_A
TELEGRAM_BOT_USERNAME=telemartadsbot
TELEGRAM_MINI_APP_URL=http://localhost:5173
TON_NETWORK=testnet
TON_API_KEY=
TON_MASTER_WALLET_MNEMONIC=
ENCRYPTION_KEY=bzHfrX1eUc2k4pMi0g3QDNvOCaKA6Rh5
JWT_SECRET=PK9T4rYjM7AaNuECD10viIpsoqkbcGWRQOlgtdyJVhUzp
DEAL_TIMEOUT=604800000
POST_VERIFICATION_DURATION=86400000
ENABLE_CRON_JOBS=true
INTERNAL_API_KEY=ZLoJDjiFgkIwr4sz1nmY59PG3xSyla2cAWUE6fVXCqhQP
```

**Important**: Make sure to update `TELEGRAM_MINI_APP_URL` to your Vercel URL once you deploy the frontend!

## Step 6: Deploy!

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait 5-10 minutes for first deployment
4. You'll get a URL like: `https://telegram-ads-backend.onrender.com`

## Step 7: Verify Deployment

Once deployed, test your backend:

```bash
# Test health endpoint (if you have one)
curl https://telegram-ads-backend.onrender.com/health

# Or check the logs in Render dashboard
```

## Render Free Tier Limits

✅ **What you get FREE:**
- 750 hours/month runtime (enough for 24/7!)
- Automatic HTTPS
- Automatic deployments on git push
- Free custom domains

⚠️ **Limitations:**
- Service spins down after 15 min of inactivity
- Takes ~30 seconds to spin back up on first request
- 512 MB RAM (should be fine for this app)

## After Deployment

### Update Frontend to Use Render Backend

In `mini-app/.env`:
```
VITE_API_URL=https://telegram-ads-backend.onrender.com/api
```

### Deploy Frontend to Vercel

```bash
cd mini-app
npm install -g vercel
vercel login
vercel
```

Follow prompts, then you'll get a Vercel URL like `https://your-app.vercel.app`

### Update Telegram Bot Mini App URL

1. Go to @BotFather
2. Send: `/myapps`
3. Select your bot
4. Select your Mini App
5. Update Web App URL to your Vercel URL

## Troubleshooting

### "Prisma generate failed"
- Check that `DATABASE_URL` is set correctly in environment variables
- Ensure root directory is set to `backend`

### "Build failed"
- Check build logs in Render dashboard
- Verify `backend/package.json` has `postinstall` script

### "Service won't start"
- Check start command is `npm start`
- Verify `dist/server.js` exists after build
- Check for errors in Render logs

### Keep Service Awake (Optional)
Free tier spins down after inactivity. To keep it awake:
- Use a service like UptimeRobot to ping your backend every 10 minutes
- Or upgrade to paid tier ($7/month) for always-on

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel  
3. ✅ Update bot Mini App URL
4. ✅ Test the full application!

---

**Estimated Time**: 15-20 minutes for first deployment

**Cost**: $0 (completely free!) 🎉
