# System Architecture

## Overview

The Telegram Ads Marketplace is built as a monorepo containing a Node.js backend and a React Mini App frontend, connected via RESTful API.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Platform                        │
│  ┌──────────────┐                      ┌─────────────────┐  │
│  │  Bot API     │◄────────────────────►│   Mini App      │  │
│  └──────────────┘                      └─────────────────┘  │
└────────┬──────────────────────────────────────┬─────────────┘
         │                                      │
         ▼                                      ▼
┌──────────────────┐                   ┌──────────────────┐
│  Backend API     │◄─────────────────►│   Frontend       │
│  (Express.js)    │    REST API       │   (React)        │
└────────┬─────────┘                   └──────────────────┘
         │
         ├──────► ┌──────────────────┐
         │        │   PostgreSQL     │
         │        │   (Prisma ORM)   │
         │        └──────────────────┘
         │
         ├──────► ┌──────────────────┐
         │        │   TON Blockchain │
         │        │   (Escrow)       │
         │        └──────────────────┘
         │
         └──────► ┌──────────────────┐
                  │   Cron Jobs      │
                  │   (Verification) │
                  └──────────────────┘
```

## Component Breakdown

### 1. Backend Service

**Technology**: Node.js with TypeScript, Express.js

**Key Modules**:

#### API Server (`src/server.ts`)
- Entry point for the application
- Middleware configuration (CORS, Helmet, Rate Limiting)
- Route registration
- Error handling

#### Telegram Bot (`src/bot.ts`)
- Handles `/start` command
- User registration
- Deal notifications
- Message routing for negotiations

#### Services Layer

**Telegram Service** (`src/services/telegram.service.ts`)
- Fetch verified channel statistics from Telegram
- Verify bot admin status
- Verify user admin permissions
- Post to channels
- Monitor post integrity
- Fetch channel admin list

**TON Service** (`src/services/ton.service.ts`)
- Generate unique wallet per deal
- Encrypt/decrypt wallet keys
- Check payment status
- Release funds to channel owner
- Refund to advertiser
- Nanoton/TON conversion

**Deal Service** (`src/services/deal.service.ts`)
- State machine implementation
- Deal lifecycle management
- Status transitions validation
- Timeout detection
- Notification orchestration

**Posting Service** (`src/services/posting.service.ts`)
- Schedule posts
- Publish to channels
- Verify post integrity
- Process scheduled posts (cron)
- Verification completion checks

#### Routes

**Channels Routes** (`src/routes/channels.routes.ts`)
- List channels with pagination
- Create channel listing
- Fetch real-time stats
- Update ad format pricing
- Sync PR managers

**Campaigns Routes** (`src/routes/campaigns.routes.ts`)
- List campaigns with filters
- Create campaign brief
- Apply to campaigns
- View applications

**Deals Routes** (`src/routes/deals.routes.ts`)
- List user deals
- Create deal
- View deal details
- Accept negotiation
- Submit creative
- Approve/revise creative

**Payments Routes** (`src/routes/payments.routes.ts`)
- Initiate escrow payment
- Check payment status
- Release funds (internal)
- Webhook handler

#### Middleware

**Auth Middleware** (`src/middleware/auth.middleware.ts`)
- Validate Telegram WebApp initData
- HMAC-SHA256 verification
- Extract user information
- Check auth expiry (24 hours)

**Admin Verification Middleware** (`src/middleware/admin-verification.middleware.ts`)
- Re-verify admin status before financial ops
- Update last verified timestamp
- Prevent unauthorized operations

#### Cron Jobs

**Timeout Job** (`src/jobs/timeout.job.ts`)
- Runs every hour
- Detects stalled deals (no activity > configured timeout)
- Cancels deals
- Refunds escrowed payments

**Verification Job** (`src/jobs/verification.job.ts`)
- Runs every 15 minutes
- Verifies posted content integrity
- Releases funds after successful verification
- Processes scheduled posts
- Transitions deals through states

### 2. Database (PostgreSQL + Prisma)

**Schema Design** (`backend/prisma/schema.prisma`)

**Key Entities**:

- **User**: Telegram users with role (CHANNEL_OWNER, ADVERTISER, BOTH)
- **Channel**: Channel listings with verified stats
- **ChannelAdmin**: PR managers with permissions
- **ChannelAdFormat**: Pricing configuration per format
- **Campaign**: Advertiser campaign briefs
- **CampaignApplication**: Channel applications to campaigns
- **ChannelListing**: Active channel listings
- **Deal**: Core deal entity with state machine
- **Creative**: Post content with approval workflow
- **Payment**: Escrow payment tracking
- **Post**: Published post verification tracking

**Relationships**:
- User → Channels (one-to-many)
- User → Campaigns (one-to-many)
- User ← → Deals (many-to-many as owner/advertiser)
- Channel → Admins (many-to-many through ChannelAdmin)
- Deal → Payment (one-to-one)
- Deal → Creatives (one-to-many)
- Deal → Post (one-to-one)

### 3. Frontend (React Mini App)

**Technology**: React with TypeScript, Vite, TailwindCSS

**Structure**:

#### Entry Point (`src/main.tsx`)
- React initialization
- Telegram WebApp ready call

#### App Shell (`src/App.tsx`)
- Role-based routing
- Telegram WebApp integration
- Role switcher (demo)

#### Pages

**Channel Owner Dashboard** (`src/pages/ChannelOwnerDashboard.tsx`)
- Channel listing management
- Statistics overview
- Active deals display
- Add channel form

**Advertiser Dashboard** (`src/pages/AdvertiserDashboard.tsx`)
- Browse channels with filters
- View channel analytics
- Create campaigns
- Manage campaigns

**Deal Flow** (`src/pages/DealFlow.tsx`)
- Unified deal interface
- Status timeline
- Payment information
- Creative submission
- Approval workflow
- Revision requests

#### Services

**API Client** (`src/services/api.ts`)
- Axios instance with auth headers
- Organized endpoint methods
- Error interceptors

#### Hooks

**useTelegramWebApp** (`src/hooks/useTelegramWebApp.ts`)
- WebApp instance access
- User information
- Ready state management

## State Machine: Deal Flow

```
NEGOTIATING
    ↓ (both parties agree)
AWAITING_PAYMENT
    ↓ (payment received)
PAYMENT_RECEIVED
    ↓ (owner ready to create content)
CREATIVE_PENDING
    ↓ (owner submits creative)
CREATIVE_REVIEW
    ├─► CREATIVE_APPROVED (advertiser approves)
    └─► CREATIVE_PENDING (requests revision)
    ↓ (approved + scheduled)
SCHEDULED
    ↓ (post time reached)
POSTED
    ↓ (verification starts)
VERIFYING
    ├─► COMPLETED (post verified, funds released)
    └─► REFUNDED (post deleted/edited)
```

**State Transition Rules**:
- Each state has defined valid next states
- Invalid transitions are rejected
- All transitions update `lastActivityAt` timestamp
- Notifications sent to both parties on transitions

## Security Architecture

### Authentication
1. Telegram WebApp provides `initData`
2. Backend validates using HMAC-SHA256 with bot token
3. User extracted from validated data
4. 24-hour auth expiry

### Escrow Security
1. **Unique wallet per deal**: Isolation prevents cross-contamination
2. **Encrypted keys**: AES encryption with env-configured key
3. **No hot wallet**: Each deal has dedicated cold wallet
4. **Automated release**: Based on verified on-chain state
5. **Admin re-verification**: Before all financial operations

### API Security
- Rate limiting (100 req/15min per IP)
- Helmet.js security headers
- CORS configuration
- Input validation with Zod
- Prisma ORM (SQL injection prevention)

## Data Flow Examples

### Example 1: Channel Owner Lists Channel

```
1. Owner clicks "Add Channel" in Mini App
2. Frontend: POST /api/channels with channel data
3. Backend: Validates auth via middleware
4. Backend: Verifies bot is admin of channel
5. Backend: Fetches channel stats from Telegram
6. Backend: Creates Channel + ChannelListing in DB
7. Backend: Returns channel object
8. Frontend: Updates UI with new channel
```

### Example 2: Complete Deal Flow

```
1. Advertiser finds channel, clicks "Create Deal"
2. Backend: Creates Deal (status: NEGOTIATING)
3. Both parties notified via Telegram bot
4. Owner accepts → status: AWAITING_PAYMENT
5. Backend: Generates escrow wallet, encrypts key
6. Advertiser sends TON to escrow address
7. Verification job detects payment → status: PAYMENT_RECEIVED
8. Owner creates content → status: CREATIVE_PENDING
9. Owner submits → status: CREATIVE_REVIEW
10. Advertiser approves + schedules → status: SCHEDULED
11. Posting job publishes at scheduled time → status: POSTED
12. Verification job starts monitoring → status: VERIFYING
13. After 24h, if post intact → status: COMPLETED
14. Verification job releases funds from escrow to owner
```

## Scalability Considerations

### Current Design
- Monolithic backend (suitable for MVP)
- Single Postgres instance
- Cron jobs on same instance

### Future Scaling
1. **Microservices**: Separate services for payments, posting, verification
2. **Queue System**: Bull/BullMQ for job processing
3. **Cache Layer**: Redis for frequent channel stats
4. **CDN**: Static frontend + API gateway
5. **Database**: Read replicas for analytics
6. **Blockchain**: TON payment provider/webhook integration

## Monitoring & Observability

### Recommended Implementation
- **Logging**: Winston or Pino structured logging
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Alerts**: Deal timeouts, payment failures, post deletions
- **Health Checks**: Database, Telegram API, TON network

## Configuration Management

### Environment Variables
- Centralized in `.env`
- Validated on startup
- Defaults for non-critical values
- Secrets via environment (not committed)

### Feature Flags (Future)
- Gradual rollout
- A/B testing
- Emergency kill switches

---

## Key Design Decisions

### 1. Why Unique Wallet Per Deal?
- **Security**: Isolates funds, prevents issues affecting all deals
- **Transparency**: Clear audit trail per deal
- **Simplicity**: No complex wallet management logic

### 2. Why State Machine for Deals?
- **Predictability**: Clear flow understanding
- **Validation**: Prevents invalid transitions
- **Debugging**: Easy to identify stuck states
- **Notifications**: Automated based on transitions

### 3. Why Prisma ORM?
- **Type Safety**: Auto-generated types from schema
- **Migrations**: Version-controlled schema changes
- **Developer Experience**: Intuitive query building
- **SQL Injection Prevention**: Parameterized queries

### 4. Why Cron Jobs Instead of Queue?
- **MVP Simplicity**: Fewer dependencies
- **Predictable**: Fixed intervals easier to reason about
- **Sufficient**: Current scale doesn't need queues

### 5. Why Monorepo?
- **Shared Types**: Backend/Frontend type consistency
- **Atomic Changes**: API + UI updated together
- **Simplified Deployment**: Single repo workflow

---

This architecture balances **simplicity for MVP** with **extensibility for production**. All major components are modular and can be extracted/scaled independently as needed.
