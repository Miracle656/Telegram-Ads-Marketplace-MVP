# Telegram Ads Marketplace MVP

A Telegram Mini App that connects channel owners with advertisers through an escrow-based deal flow system.

## 🎯 Features

### Dual-Sided Marketplace
- **Channel Owners**: List channels, set pricing for different ad formats, manage deals
- **Advertisers**: Browse channels, create campaign briefs, initiate deals
- **Unified Deal Flow**: Both entry points converge into a single negotiation and approval workflow

### Verified Channel Analytics
- Real-time subscriber count from Telegram API
- Average views tracking
- Language distribution
- Bot admin verification required

### TON Blockchain Escrow
- Secure escrow payments using TON blockchain
- Unique wallet per deal for maximum security
- Encrypted wallet key storage
- Automatic fund release after verification
- Refund support for cancelled or failed deals

### Creative Approval Workflow
1. Advertiser creates campaign/initiates deal
2. Channel owner accepts and creates post content
3. Advertiser reviews and approves (or requests revision)
4. Post is scheduled and auto-published
5. Verification period ensures post integrity
6. Funds automatically released after successful verification

### Auto-Posting & Verification
- Scheduled posting to Telegram channels
- Post integrity monitoring (deletion/edit detection)
- Configurable verification period
- Automatic fund release upon successful verification

## 📊 MVP Implementation Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| **1. Marketplace Model** | ✅ Done | Channel & Campaign creation, Unified Deal Flow, Filtering (basic) |
| **2. Verified Stats** | ⚠️ Partial | Subscriber count is real. Views are estimated (10% of subs). |
| **3. Ad Formats** | ✅ Done | Post, Forward, Story, Custom formats supported. Pricing per channel. |
| **4. TON Escrow** | ✅ Done | Smart Contract (Tolk), Unique Deal Flow, Auto-cancel (Timeout Job), Refunds. |
| **5. Creative Approval** | ✅ Done | Negotiation -> Draft -> Revision -> Approval loop implemented. |
| **6. Auto-Posting** | ✅ Done | Bot posts to channel. Verification mocked (assumes success). |
| **7. PR Manager Flow** | ❌ Skipped | Not in MVP scope. Admin syncing is implemented but single-user management. |


## 🏗️ Architecture

### Backend (Node.js/TypeScript)
- **Express.js** API server with RESTful endpoints
- **PostgreSQL** database with Prisma ORM
- **Telegram Bot API** for channel stats and posting
- **TON SDK** for blockchain escrow operations
- **Cron Jobs** for timeout management and verification

### Frontend (React/TypeScript)
- **React** with TypeScript and Vite
- **TailwindCSS** for styling with Telegram theme colors
- **Telegram Mini Apps SDK** for native integration
- **React Router** for navigation

### Database Schema
Key entities:
- Users (with roles: CHANNEL_OWNER, ADVERTISER, BOTH)
- Channels (with admin verification)
- Campaigns (advertiser briefs)
- Deals (state machine: NEGOTIATING → POSTED → VERIFIED → COMPLETED)
- Payments (escrow tracking)
- Creatives (approval workflow)
- Posts (verification tracking)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- **Database**: Supabase (recommended) or PostgreSQL
- Telegram Bot Token ([Create via @BotFather](https://t.me/botfather))
- TON API Key (optional for mainnet)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd telegram
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username

# TON Blockchain
TON_NETWORK=testnet
TON_API_KEY=your_ton_api_key

# Encryption
ENCRYPTION_KEY=your_32_char_encryption_key

# JWT
JWT_SECRET=your_jwt_secret
```

4. **Set up the database**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. **Generate SSL certificates for HTTPS (required for Telegram Mini Apps)**
```bash
cd mini-app
mkdir certs
# Use mkcert or similar tool to generate localhost certificates
# Place them as certs/localhost-key.pem and certs/localhost.pem
```

6. **Start development servers**
```bash
# From root directory
npm run dev
```

This starts:
- Backend API on http://localhost:3000
- Mini App on https://localhost:5173

### Set up Telegram Bot

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set up Mini App:
   ```
   /newapp
   Select your bot
   Enter app title
   Enter app description
   Upload app icon (512x512px)
   Enter web app URL: https://your-domain.com
   ```

## 📖 API Documentation

### Authentication
All API requests require the `X-Telegram-Init-Data` header with Telegram WebApp initData.

### Endpoints

#### Channels
- `GET /api/channels` - List all active channels
- `POST /api/channels` - Create channel listing
- `GET /api/channels/:id/stats` - Get verified channel stats
- `PUT /api/channels/:id/pricing` - Update ad format pricing
- `POST /api/channels/:id/admins` - Sync PR managers from Telegram

#### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/apply` - Apply with channel to campaign

#### Deals
- `GET /api/deals` - List user's deals
- `POST /api/deals` - Create new deal
- `GET /api/deals/:id` - Get deal details
- `PUT /api/deals/:id/accept` - Accept negotiation
- `POST /api/deals/:id/creative` - Submit creative
- `PUT /api/deals/:id/approve` - Approve creative
- `PUT /api/deals/:id/revise` - Request revision

#### Payments
- `POST /api/payments/initiate` - Initiate escrow payment
- `GET /api/payments/:dealId/status` - Check payment status

## 🔧 Configuration

### Deal Timeouts
Configure in `.env`:
```env
DEAL_TIMEOUT=604800000  # 7 days in milliseconds
```

### Post Verification Duration
```env
POST_VERIFICATION_DURATION=86400000  # 24 hours in milliseconds
```

### Cron Jobs
```env
ENABLE_CRON_JOBS=true
```

Jobs:
- **Timeout Job**: Runs hourly to cancel stalled deals
- **Verification Job**: Runs every 15 minutes to verify posts and process scheduled posts

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Integration Tests
```bash
cd backend
npm run test:integration
```

### Manual Testing
1. Open the Mini App via Telegram bot
2. Switch between Channel Owner and Advertiser roles
3. Create a channel listing (requires adding bot as admin)
4. Create a campaign as advertiser
5. Initiate a deal
6. Test the complete flow: negotiation → payment → creative → posting → verification

## 📦 Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Build the backend:
   ```bash
   cd backend
   npm run build
   ```
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
5. Start the server:
   ```bash
   npm start
   ```

### Frontend Deployment
1. Update `VITE_API_URL` in build environment
2. Build the frontend:
   ```bash
   cd mini-app
   npm run build
   ```
3. Serve the `dist` folder via CDN or static hosting
4. Update Telegram Bot Mini App URL

### Recommended Platforms
- **Backend**: Railway, Render, DigitalOcean
- **Database**: Supabase, Railway, Neon
- **Frontend**: Vercel, Netlify, Cloudflare Pages

## 🔒 Security Considerations

### Implemented
- ✅ Telegram WebApp data validation using HMAC-SHA256
- ✅ Encrypted wallet keys at rest
- ✅ Unique wallet per deal (not hot wallet)
- ✅ Admin re-verification before financial operations
- ✅ Rate limiting on API endpoints
- ✅ Helmet.js security headers
- ✅ Input validation using Zod

### Future Enhancements
- 2FA for high-value transactions
- Wallet backup/recovery mechanism
- Multi-signature for large deals
- Dispute resolution system

## 🎨 Tech Stack

**Backend:**
- Node.js with TypeScript
- Express.js
- PostgreSQL with Prisma ORM
- node-telegram-bot-api
- @ton/ton for blockchain integration
- node-cron for scheduled tasks

**Frontend:**
- React with TypeScript
- Vite
- TailwindCSS
- Telegram Mini Apps SDK
- React Router
- Lucide React (icons)

## 📝 Known Limitations

1. **Channel Analytics**: Some advanced metrics (detailed language charts, Premium user stats) may not be available via Telegram Bot API and require manual verification.

2. **Post Verification**: Telegram Bot API doesn't provide direct message modification detection. The current implementation uses periodic checks and has limitations.

3. **Wallet Management**: User wallet addresses for fund release need to be configured in user profiles (currently placeholder).

4. **HTTPS Development**: Requires SSL certificates for local development (Telegram Mini Apps requirement).

5. **PR Manager Flow**: Admin synchronization is implemented but may need manual approval for security-critical operations.

## 🚧 Future Enhancements

### High Priority
- [ ] User wallet profile management
- [ ] Dispute resolution mechanism
- [ ] Advanced filtering (engagement rate, niche categories)
- [ ] In-app messaging (currently uses Telegram bot)
- [ ] Email notifications for deal updates

### Medium Priority
- [ ] Analytics dashboard for earnings/spending
- [ ] Reputation system with ratings
- [ ] Bulk deal creation
- [ ] Template creatives
- [ ] Multi-currency support

### Low Priority
- [ ] Channel performance predictions using ML
- [ ] Automated content suggestions
- [ ] Integration with other blockchains
- [ ] Mobile app (native)

## 💡 AI Usage Disclosure

This project was developed with AI assistance. Approximate breakdown:

- **Architecture & Design**: 30% AI-generated, 70% human review and modifications
- **Backend Code**: 85% AI-generated boilerplate and services
- **Frontend Code**: 80% AI-generated components with custom styling
- **Documentation**: 75% AI-generated
- **Overall**: ~75% of code generated by AI, with significant human oversight for architecture decisions, security implementations, and business logic validation

All AI-generated code has been reviewed for security, correctness, and best practices.

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is an MVP project for demonstration purposes. For production use, additional security audits and testing are recommended.

## 📧 Support

For issues and questions, please open a GitHub issue or contact the development team.

---

**Built with ❤️ for the Telegram Mini Apps ecosystem**
