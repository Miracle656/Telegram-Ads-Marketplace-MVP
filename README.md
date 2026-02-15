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
| **4. TON Escrow** | ✅ Done | Smart Contract (Tolk), Unique Deal Flow, Auto-cancel. **Retry logic & Backoff implemented.** |
| **5. Creative Approval** | ✅ Done | Negotiation -> Draft -> Revision -> Approval loop implemented. |
| **6. Auto-Posting** | ✅ Done | Bot posts to channel. Verification mocked (assumes success). |
| **7. PR Manager Flow** | ❌ Skipped | Not in MVP scope. Admin syncing is implemented but single-user management. |

## 🏗️ Architecture

The project is structured as a monorepo containing a full-stack application designed to facilitate ad marketplace operations on Telegram.

### **Frontend (`/mini-app`)**
- **Framework**: React (Vite) with TypeScript.
- **Styling**: Tailwind CSS for rapid, responsive UI development.
- **State Management**: React Hooks and Context API.
- **Integration**: 
  - `TonConnect` for wallet connectivity.
  - Telegram Web App (TWA) SDK for native-like experience within Telegram.
- **Key Features**: 
  - Channel Owner & Advertiser Dashboards.
  - Deal creation and management flow.
  - Wallet connection and transaction signing.

### **Backend (`/backend`)**
- **Runtime**: Node.js with Express.
- **Database**: PostgreSQL (hosted on Supabase/Render) with **Prisma ORM**.
- **Blockchain Interaction**: `@ton/ton` library for interacting with the TON blockchain (wallet creation, transfers, payment verification).
- **Bot Integration**: `node-telegram-bot-api` for notifications and user verification.
- **Scheduling**: `node-cron` for background jobs (payment verification, deal timeouts).

## 💡 Key Decisions

1.  **Dual-Wallet Escrow System**: 
    - Instead of smart contracts (which add complexity and audit requirements), we implemented a programmatic escrow using backend-managed TON wallets.
    - Each deal generates a unique keypair/wallet to hold funds, releasing them only upon verified completion.

2.  **Singleton Database Connection**:
    - Adopted a singleton pattern for `PrismaClient` to manage connection pooling efficiently, specifically to address `MaxClientsInSessionMode` limits on the deployment platform (Render).

3.  **Polling & Retry Logic for TON**:
    - Implemented aggressive caching and exponential backoff retry strategies (in `ton.service.ts`) to handle TON public API rate limits (`429` errors) without compromising transaction reliability.

4.  **Bot as Admin**:
    - Leveraged the Telegram Bot API to verify channel ownership and admin rights dynamically, ensuring only legitimate channel owners can list assets.

## 🚀 Future Thoughts

- **Smart Contract Escrow**: Transitioning from backend-wallet escrow to a true TON smart contract for trustless operations.
- **Analytics Engine**: Building a dedicated service to scrape and index channel statistics (views, engagement) to verify ad performance automatically.
- **User Reputation System**: Implementing a scoring system for advertisers and channel owners based on successful deal completions.
- **Multi-Currency Support**: Expanding beyond TON to support USDT (Jettons) for payments.

## ⚠️ Known Limitations

- **Centralized Escrow Keys**: Private keys for deal wallets are currently generated and stored (encrypted) by the backend. While secure for an MVP, this is custodial validation.
- **TON API Rate Limits**: Reliance on public TON Center nodes can lead to congestion. A dedicated RPC node or API service (like TonCenter Pro/Tatum) is recommended for scaling.
- **Manual Verification Fallback**: Content verification logic is basic; sophisticated ad format compliance (e.g., verifying a specific message was pinned for X hours) may still require manual admin intervention in edge cases.

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
