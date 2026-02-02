# Quick Start: Deploy to Render (Free)

## What You Need

1. GitHub account
2. Git installed
3. Code pushed to GitHub

## Quick Steps

### 1. Push to GitHub

```bash
# In telegram directory
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/telegram-ads-marketplace.git
git push -u origin main
```

### 2. Deploy on Render

1. Go to https://render.com and sign up (use GitHub login)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add environment variables (copy from `.env` file)

6. Click **"Create Web Service"**

### 3. Wait & Get URL

- Build takes ~5-10 minutes
- You'll get a URL like: `https://telegram-ads-backend.onrender.com`

### 4. Deploy Frontend to Vercel

```bash
cd mini-app
npm install -g vercel
vercel
```

### 5. Update URLs

- Update `mini-app/.env`: `VITE_API_URL=https://your-render-url.onrender.com/api`
- Update backend env on Render: `TELEGRAM_MINI_APP_URL=https://your-vercel-url.vercel.app`

## Done! 🎉

Your app is live and accessible from Telegram!

---

**Need detailed help?** See [RENDER_DEPLOYMENT.md](file:///c:/Users/HP/Documents/telegram/RENDER_DEPLOYMENT.md)
