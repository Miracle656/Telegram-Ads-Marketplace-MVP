# Setup Instructions

## Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Telegram Bot Token

### Steps

1. **Clone and configure**
```bash
git clone <repository-url>
cd telegram
cp .env.example .env
# Edit .env with your Telegram Bot Token
```

2. **Start with Docker Compose**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Backend API on port 3000
- Frontend on port 5173 (with HTTPS)

3. **Run migrations**
```bash
docker-compose exec backend npx prisma migrate deploy
```

4. **Access the app**
- Open https://localhost:5173 in your browser
- Or access via your Telegram bot

## Manual Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp ../.env.example ../.env
# Edit .env with your configuration

# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Start development server
npm run dev
```

Backend will run on http://localhost:3000

### 2. Frontend Setup

```bash
cd mini-app

# Install dependencies
npm install

# Generate SSL certificates for HTTPS
mkdir certs

# On macOS/Linux with mkcert:
mkcert -install
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1

# On Windows with Chocolatey:
# choco install mkcert
# mkcert -install
# mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

Frontend will run on https://localhost:5173

### 3. Telegram Bot Setup

1. **Create Bot**
   - Open [@BotFather](https://t.me/botfather)
   - Send `/newbot`
   - Follow prompts to create your bot
   - Copy the bot token

2. **Create Mini App**
   - Send `/newapp` to @BotFather
   - Select your bot
   - Enter details:
     - Title: Ads Marketplace
     - Description: Connect channel owners with advertisers
     - Photo: Upload 640x360px image
     - Web App URL: https://your-domain.com (for production) or use ngrok for testing

3. **For Local Development with ngrok**
```bash
# Install ngrok
npm install -g ngrok

# Expose your local frontend
ngrok http https://localhost:5173

# Update bot Mini App URL with ngrok URL
```

### 4. Database Setup

**Option A: Supabase (Recommended)**

Supabase is the easiest way to get started with a PostgreSQL database:

1. **Create a Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Create a new project (takes ~2 minutes)

2. **Get your connection string**
   - Go to Project Settings → Database
   - Copy the "Connection Pooling" string (recommended for serverless)
   - Should look like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

3. **Update your .env file**
   ```env
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

4. **Run migrations**
   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma generate
   ```

**That's it!** Supabase provides:
- ✅ Automatic backups
- ✅ Built-in dashboard for data viewing
- ✅ Free tier (500MB database, 2GB bandwidth)
- ✅ No server management needed

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL
# On macOS: brew install postgresql
# On Ubuntu: sudo apt-get install postgresql

# Create database
createdb telegram_ads_marketplace

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://localhost:5432/telegram_ads_marketplace
```

**Option B: Hosted Database**
- Use [Supabase](https://supabase.com), [Railway](https://railway.app), or [Neon](https://neon.tech)
- Create a PostgreSQL database
- Copy connection string to `.env`

## Environment Variables

### Backend `.env`

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=https://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/telegram_ads_marketplace

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_MINI_APP_URL=https://t.me/your_bot_name/app

# TON Blockchain
TON_NETWORK=testnet
TON_API_KEY=optional_api_key
TON_MASTER_WALLET_MNEMONIC=word1 word2 ... word24

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Timeouts (milliseconds)
DEAL_TIMEOUT=604800000  # 7 days
POST_VERIFICATION_DURATION=86400000  # 24 hours

# Cron Jobs
ENABLE_CRON_JOBS=true

# Internal API (for cron jobs)
INTERNAL_API_KEY=your_internal_api_key
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:3000/api
```

## Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Integration Tests
```bash
cd backend
npm run test:integration
```

### Manual Testing Checklist

- [ ] Bot responds to /start
- [ ] Mini App opens from Telegram
- [ ] Can add a channel (bot must be admin)
- [ ] Channel stats are fetched
- [ ] Can create a campaign
- [ ] Can create a deal
- [ ] Payment flow works (testnet)
- [ ] Creative submission works
- [ ] Approval workflow functions
- [ ] Posts are published
- [ ] Verification detects changes

## Common Issues

### "Failed to load modules" in Vite

**Solution**: Ensure you have SSL certificates:
```bash
cd mini-app
mkdir -p certs
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost
```

### "TELEGRAM_BOT_TOKEN is not set"

**Solution**: Check `.env` file exists in root and contains valid token

### "Failed to connect to database"

**Solution**: 
1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Ensure database exists

### "Bot not admin of channel"

**Solution**:
1. Open your channel
2. Add your bot as administrator
3. Grant posting permissions
4. Try adding channel again

### Port already in use

**Solution**:
```bash
# Stop conflicting process
# On Unix: lsof -ti:3000 | xargs kill
# On Windows: netstat -ano | findstr :3000
# Then kill the PID
```

## Production Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed production deployment instructions.

## Next Steps

After setup:
1. Test the bot with `/start` command
2. Open the Mini App
3. Add a test channel (as channel owner)
4. Create a test campaign (as advertiser)
5. Run through a complete deal flow

## Support

For issues during setup:
1. Check the logs: `docker-compose logs -f` or check terminal output
2. Verify all environment variables are set
3. Ensure PostgreSQL is accessible
4. Check Telegram bot token is valid

## Development Workflow

1. **Make changes** to backend/frontend code
2. **Hot reload** automatically applies changes
3. **Test** the changes in Telegram
4. **Commit** when ready
5. **Deploy** to production

---

Happy coding! 🚀
