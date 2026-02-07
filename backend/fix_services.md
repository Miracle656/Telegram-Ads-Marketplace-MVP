# Quick Reference: All Remaining Fixes

## deal.service.ts
- Line 41: Change `adFormat:` to `adFormatType:`
- Line 72: Add `parseInt(dealId)`  
- Line 87: Add `parseInt(dealId)`
- Line 110: Add `parseInt(dealId)`
- Line 144: Add `parseInt(dealId)`
- Line 153: Add `include: { payment: true}`
- Line 158: Add `parseInt(dealId)`
- Line 238,244: Convert deal.id to String

## posting.service.ts
- Line 16: Add `parseInt(dealId)`
- Line 26: Add `parseInt(dealId)`  
- Line 26: Add `include: { channel: true, creatives: true }`
- Line 68: Convert dealId str→int, channelId int→str
- Line 86,110,118,125,140: Add `parseInt(postId/dealId)`
- Line 95: Add `include: { channel: true }`
- Line 104: Change `telegramMessageId` to `messageId`
- Line 126: Change `lastCheckedAt` to `lastChecked`  
- Line 148: Change `verifiedUntil` to `verifiedAt`
- Line 153: Delete `isVerified` field
- Line 178: Convert deal.id to String
