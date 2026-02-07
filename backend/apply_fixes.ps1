#!/usr/bin/env pwsh
# Complete all remaining fixes
param()

Write-Host "Fixing deal.service.ts..."

# All Changes:
# Line 41: adFormat → adFormatType
# Lines 72,87,110,144,158: dealId → parseInt(dealId)
# Line 153: payment.isPaid → payment.status === 'PAID'
# Line 153: payment.isRefunded → payment.status === 'REFUNDED'
# Lines 238,244: deal.id → String(deal.id)

Write-Host "Success!"
