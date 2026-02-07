import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { dealService } from '../services/deal.service';
import { tonService } from '../services/ton.service';

const prisma = new PrismaClient();

/**
 * Check for timed-out deals and cancel them
 * Runs every hour
 */
export const timeoutJob = cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running timeout job...');

    try {
        const timedOutDeals = await dealService.getTimedOutDeals();

        for (const deal of timedOutDeals) {
            console.log(`Cancelling timed-out deal: ${deal.id}`);

            // If payment exists and is paid, refund it
            if (deal.payment && (deal.payment as any).status === 'PAID') {
                try {
                    // TODO: Get advertiser wallet address from their profile
                    const advertiserWallet = 'ADVERTISER_WALLET_ADDRESS';

                    await tonService.refundFunds(
                        deal.payment.escrowWallet,
                        deal.payment.encryptedKey,
                        advertiserWallet,
                        BigInt(deal.payment.amount)
                    );

                    await prisma.payment.update({
                        where: { id: deal.payment.id },
                        data: {
                            status: 'REFUNDED',
                            refundedAt: new Date()
                        }
                    });

                    console.log(`✅ Refunded payment for deal ${deal.id}`);
                } catch (error) {
                    console.error(`❌ Failed to refund payment for deal ${deal.id}:`, error);
                }
            }

            // Cancel the deal
            await dealService.cancelDeal(String(deal.id), 'Deal timed out due to inactivity');
        }

        console.log(`✅ Timeout job completed. Processed ${timedOutDeals.length} deals`);
    } catch (error) {
        console.error('❌ Timeout job failed:', error);
    }
});

export default timeoutJob;
