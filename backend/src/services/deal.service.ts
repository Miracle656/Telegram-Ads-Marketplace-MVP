import { PrismaClient, DealStatus, Deal } from '@prisma/client';
import { sendDealNotification } from '../bot';

const prisma = new PrismaClient();

/**
 * Deal state machine transitions
 */
const VALID_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
    NEGOTIATING: ['AWAITING_PAYMENT', 'CANCELLED'],
    AWAITING_PAYMENT: ['PAYMENT_RECEIVED', 'CANCELLED'],
    PAYMENT_RECEIVED: ['CREATIVE_PENDING', 'REFUNDED'],
    CREATIVE_PENDING: ['CREATIVE_REVIEW', 'CANCELLED'],
    CREATIVE_REVIEW: ['CREATIVE_PENDING', 'CREATIVE_APPROVED', 'CANCELLED'],
    CREATIVE_APPROVED: ['SCHEDULED', 'CANCELLED'],
    SCHEDULED: ['POSTED', 'CANCELLED'],
    POSTED: ['VERIFYING', 'REFUNDED'],
    VERIFYING: ['COMPLETED', 'REFUNDED'],
    COMPLETED: [],
    CANCELLED: [],
    REFUNDED: []
};

export class DealService {
    /**
     * Create a new deal
     */
    async createDeal(data: {
        channelId: string;
        channelOwnerId: string;
        advertiserId: string;
        campaignId?: string;
        listingId?: string;
        adFormatType: string;
        customFormatName?: string;
        agreedPrice: number;
    }): Promise<Deal> {
        const deal = await prisma.deal.create({
            data: {
                ...data,
                adFormatType: data.adFormatType as any,
                status: DealStatus.NEGOTIATING
            },
            include: {
                channel: true,
                owner: true,
                advertiser: true
            }
        });

        // Notify both parties
        await sendDealNotification(
            deal.owner.telegramId,
            `🎯 New deal created for ${deal.channel.title}!\nStatus: Negotiating`,
            deal.id
        );

        await sendDealNotification(
            deal.advertiser.telegramId,
            `🎯 New deal created for ${deal.channel.title}!\nStatus: Negotiating`,
            deal.id
        );

        return deal;
    }

    /**
     * Transition deal to new status
     */
    async transitionDeal(dealId: string, newStatus: DealStatus): Promise<Deal> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // Validate transition
        const validNextStates = VALID_TRANSITIONS[deal.status];
        if (!validNextStates.includes(newStatus)) {
            throw new Error(`Invalid transition from ${deal.status} to ${newStatus}`);
        }

        // Update deal
        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: newStatus,
                lastActivityAt: new Date()
            },
            include: {
                channel: true,
                owner: true,
                advertiser: true
            }
        });

        // Send notifications based on status
        await this.notifyStatusChange(updatedDeal);

        return updatedDeal;
    }

    /**
     * Update last activity timestamp
     */
    async updateActivity(dealId: string): Promise<void> {
        await prisma.deal.update({
            where: { id: dealId },
            data: { lastActivityAt: new Date() }
        });
    }

    /**
     * Get deals that have timed out
     */
    async getTimedOutDeals(): Promise<Deal[]> {
        const timeout = parseInt(process.env.DEAL_TIMEOUT || '604800000'); // 7 days default
        const cutoffDate = new Date(Date.now() - timeout);

        return prisma.deal.findMany({
            where: {
                status: {
                    in: [DealStatus.NEGOTIATING, DealStatus.CREATIVE_PENDING, DealStatus.CREATIVE_REVIEW]
                },
                lastActivityAt: {
                    lt: cutoffDate
                }
            },
            include: {
                payment: true,
                owner: true,
                advertiser: true
            }
        });
    }

    /**
     * Cancel deal and refund if necessary
     */
    async cancelDeal(dealId: string, reason: string): Promise<Deal> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { payment: true, owner: true, advertiser: true }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // If payment was made, initiate refund
        if (deal.payment && deal.payment.isPaid && !deal.payment.isRefunded) {
            // Refund will be handled by payment service
        }

        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: { status: DealStatus.CANCELLED }
        });

        // Notify both parties
        await sendDealNotification(
            deal.owner.telegramId,
            `❌ Deal cancelled: ${reason}`,
            dealId
        );

        await sendDealNotification(
            deal.advertiser.telegramId,
            `❌ Deal cancelled: ${reason}`,
            dealId
        );

        return updatedDeal;
    }

    /**
     * Send notifications based on status change
     */
    private async notifyStatusChange(deal: Deal & { owner: any; advertiser: any; channel: any }): Promise<void> {
        const statusMessages: Record<DealStatus, { owner: string; advertiser: string }> = {
            NEGOTIATING: {
                owner: '🤝 Deal in negotiation',
                advertiser: '🤝 Deal in negotiation'
            },
            AWAITING_PAYMENT: {
                owner: '⏳ Waiting for payment',
                advertiser: '💳 Please complete payment'
            },
            PAYMENT_RECEIVED: {
                owner: '✅ Payment received! Create your post',
                advertiser: '✅ Payment confirmed'
            },
            CREATIVE_PENDING: {
                owner: '📝 Creating post content',
                advertiser: '⏳ Waiting for post draft'
            },
            CREATIVE_REVIEW: {
                owner: '⏳ Post submitted for review',
                advertiser: '👀 Please review the post'
            },
            CREATIVE_APPROVED: {
                owner: '✅ Post approved!',
                advertiser: '✅ Post approved'
            },
            SCHEDULED: {
                owner: '📅 Post scheduled',
                advertiser: '📅 Post scheduled'
            },
            POSTED: {
                owner: '🎉 Post is live!',
                advertiser: '🎉 Post is live!'
            },
            VERIFYING: {
                owner: '🔍 Verifying post...',
                advertiser: '🔍 Verifying post...'
            },
            COMPLETED: {
                owner: '💰 Deal completed! Funds released',
                advertiser: '✅ Deal completed successfully'
            },
            CANCELLED: {
                owner: '❌ Deal cancelled',
                advertiser: '❌ Deal cancelled'
            },
            REFUNDED: {
                owner: '↩️ Payment refunded',
                advertiser: '↩️ Payment refunded to you'
            }
        };

        const messages = statusMessages[deal.status];

        await sendDealNotification(
            deal.owner.telegramId,
            `${messages.owner}\n\nChannel: ${deal.channel.title}`,
            deal.id
        );

        await sendDealNotification(
            deal.advertiser.telegramId,
            `${messages.advertiser}\n\nChannel: ${deal.channel.title}`,
            deal.id
        );
    }
}

export const dealService = new DealService();
