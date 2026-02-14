# Escrow Smart Contract Deployment Guide

## Overview
Deploy the AdEscrow TON smart contract to testnet for proper escrow functionality.

## Prerequisites
1. **Testnet TON**: Get ~0.1 TON from https://t.me/testgiver_ton_bot
2. **Wallet Mnemonic**: Already configured in `Escrow/.env`

## Deployment Steps

### 1. Build the Contract
```bash
cd c:\Users\HP\Documents\telegram\Escrow
npx blueprint build
```
- Select: `AdEscrow`

### 2. Deploy to Testnet
```bash
npx blueprint run
```
- Select script: `deployAdEscrow`
- Select network: `testnet`
- Confirm deployment (~0.05 TON cost)

### 3. Copy Contract Address
After deployment completes, you'll see:
```
✅ Escrow contract deployed at: EQ...abc123
✅ Owner/Arbiter: EQ...yourwallet
```

**IMPORTANT**: Copy the contract address (starts with `EQ`)

### 4. Configure Backend
Add to `backend/.env`:
```env
ESCROW_CONTRACT_ADDRESS=EQ_PASTE_YOUR_CONTRACT_ADDRESS_HERE
```

### 5. Verify Deployment
Check your contract on testnet explorer:
```
https://testnet.tonscan.org/address/YOUR_CONTRACT_ADDRESS
```

## How It Works

### Payment Flow with Escrow:
1. **Advertiser pays** → Sends TON + Deposit message (0x02) to escrow contract
2. **Funds held** → Contract status = FUNDED (1)
3. **Ad posted** → Backend sends Release message (0x03)
4. **Funds released** → Channel owner receives payment

### Refund Flow (if needed):
1. **Issue occurs** → Advertiser requests refund
2. **Backend reviews** → You (arbiter) decide
3. **Send Refund** → Backend sends Refund message (0x04)
4. **Funds returned** → Advertiser gets money back

## Contract Operations

### As Arbiter (Owner), you can:
- **Initialize** escrow for each deal (opcode 0x01)
- **Release** funds to channel owner (opcode 0x03)
- **Refund** funds to advertiser (opcode 0x04)

### Advertiser can:
- **Deposit** funds (opcode 0x02)

## Next Steps
Once deployed:
1. I'll update the backend to use your contract
2. Update frontend to send correct opcodes
3. Test the full payment flow

**Ready to deploy?** Let me know when you have the contract address!
