import cron from 'node-cron';
import { PrismaClient, DealStatus } from '@prisma/client';
import { postingService } from '../services/posting.service';
import { dealService } from '../services/deal.service';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Verify posted ads and release funds when verification is complete
 * Runs every 15 minutes
 */
export const verificationJob = cron.schedule('*/15 * * * *', async () => {
    console.log('🔍 Running verification job...');

    try {
        // Get all deals in VERIFYING status
        const verifyingDeals = await prisma.deal.findMany({
            where: { status: DealStatus.VERIFYING },
            include: {
                post: true,
                payment: true,
                owner: true
            }
        });

        for (const deal of verifyingDeals) {
            if (!deal.post) continue;

            try {
                // Check if verification period is complete
                const isComplete = await postingService.checkVerificationComplete(deal.id);

                if (isComplete) {
                    // Verify post integrity one last time
                    const { isValid, issues } = await postingService.verifyPostIntegrity(deal.post.id);

                    if (isValid) {
                        console.log(`✅ Post verified for deal ${deal.id}, releasing funds...`);

                        // Release funds via internal API
                        try {
                            await axios.post(
                                `http://localhost:${process.env.PORT || 3000}/api/payments/${deal.id}/release`,
                                {
                                    internalKey: process.env.INTERNAL_API_KEY
                                }
                            );

                            console.log(`💰 Funds released for deal ${deal.id}`);
                        } catch (error) {
                            console.error(`❌ Failed to release funds for deal ${deal.id}:`, error);
                        }
                    } else {
                        console.log(`⚠️ Post integrity issues for deal ${deal.id}:`, issues);

                        // Transition to REFUNDED and refund advertiser
                        await dealService.transitionDeal(deal.id, DealStatus.REFUNDED);

                        if (deal.payment) {
                            // Refund logic would go here
                            console.log(`↩️ Initiated refund for deal ${deal.id}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Error verifying deal ${deal.id}:`, error);
            }
        }

        // Process scheduled posts
        await postingService.processScheduledPosts();

        // Transition POSTED deals to VERIFYING
        const postedDeals = await prisma.deal.findMany({
            where: { status: DealStatus.POSTED },
            include: { post: true }
        });

        for (const deal of postedDeals) {
            if (deal.post) {
                await dealService.transitionDeal(deal.id, DealStatus.VERIFYING);
            }
        }

        console.log(`✅ Verification job completed`);
    } catch (error) {
        console.error('❌ Verification job failed:', error);
    }
});

export default verificationJob;
