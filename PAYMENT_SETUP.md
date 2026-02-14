# Payment Setup Instructions

## Problem
Payments are bouncing back because generated wallets are **not initialized** on the TON blockchain. In TON, you cannot send funds to an uninitialized wallet - transactions will bounce back.

## Solution
Use a **master escrow wallet** that's already deployed and can receive payments.

## Setup Steps

### 1. Get Your TON Wallet Address

You need a TON wallet that's already initialized (has received at least one transaction). Use your existing Tonkeeper wallet address.

**Your wallet address format:** `EQ...` (starts with EQ)

### 2. Add to Environment Variables

In your backend `.env` file, add:

```env
MASTER_ESCROW_WALLET=YOUR_TONKEEPER_WALLET_ADDRESS_HERE
```

Example:
```env
MASTER_ESCROW_WALLET=EQBx1234...abcd
```

### 3. Deploy

1. Update `.env` file locally
2. Add the environment variable to Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `MASTER_ESCROW_WALLET` = `YOUR_WALLET_ADDRESS`
3. Redeploy

## How It Works Now

1. **Before**: Generated new wallet per deal → Wallet not initialized → Payment bounces
2. **Now**: All payments go to YOUR master wallet → Wallet exists → Payment succeeds
3. When deal completes, you manually release funds to channel owner from your wallet

## Manual Release Process (Temporary)

Until we implement automatic releases:

1. Advertiser pays → money goes to YOUR wallet
2. Ad gets posted → deal marked complete  
3. You manually send money to channel owner from your wallet

## Future Improvement

We can implement automatic fund releases using:
- TON smart contract that holds and releases funds
- Or backend automation that sends funds when deal completes

But for MVP, manual release from your master wallet works fine!
