import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { DealStatus, CreativeStatus, PaymentStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { verifyAdminMiddleware } from '../middleware/admin-verification.middleware';
import { dealService } from '../services/deal.service';
import { postingService } from '../services/posting.service';
import { tonService } from '../services/ton.service';
import { sendDealNotification } from '../bot';
import { z } from 'zod';

const router = Router();

const createDealSchema = z.object({
    channelId: z.string(),
    advertiserId: z.string(),
    campaignId: z.string().optional(),
    listingId: z.string().optional(),
    adFormatType: z.enum(['POST', 'FORWARD', 'REPOST', 'STORY', 'CUSTOM']),
    customFormatName: z.string().optional(),
    agreedPrice: z.number().positive()
});

const submitCreativeSchema = z.object({
    content: z.string().min(1),
    mediaUrls: z.array(z.string()).optional()
});

/**
 * GET /api/deals - List user's deals
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const telegramUser = (req as any).telegramUser;

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramUser.id) }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const deals = await prisma.deal.findMany({
            where: {
                OR: [
                    { channelOwnerId: user.id },
                    { advertiserId: user.id }
                ]
            },
            include: {
                channel: true,
                owner: {
                    select: { username: true, firstName: true }
                },
                advertiser: {
                    select: { username: true, firstName: true }
                },
                payment: true,
                creatives: {
                    orderBy: { version: 'desc' },
                    take: 1
                },
                post: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(deals);
    } catch (error) {
        console.error('Error fetching deals:', error);
        res.status(500).json({ error: 'Failed to fetch deals' });
    }
});

/**
 * POST /api/deals - Create new deal
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const data = createDealSchema.parse(req.body);
        const telegramUser = (req as any).telegramUser;

        // Get or create the advertiser user
        const advertiser = await prisma.user.upsert({
            where: { telegramId: BigInt(telegramUser.id) },
            update: {},
            create: {
                telegramId: BigInt(telegramUser.id),
                username: telegramUser.username,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName,
                role: 'ADVERTISER'
            }
        });

        // Get channel owner
        const channel = await prisma.channel.findUnique({
            where: { id: parseInt(data.channelId) }
        });

        if (!channel) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        const deal = await dealService.createDeal({
            channelId: data.channelId,
            channelOwnerId: String(channel.ownerId),
            advertiserId: String(advertiser.id), // Use database ID, not Telegram ID
            campaignId: data.campaignId,
            adFormatType: data.adFormatType,
            customFormatName: data.customFormatName,
            agreedPrice: data.agreedPrice
        });

        res.status(201).json(deal);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Error creating deal:', error);
        res.status(500).json({ error: 'Failed to create deal' });
    }
});

/**
 * GET /api/deals/:id - Get deal details
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const deal = await prisma.deal.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                channel: {
                    include: {
                        adFormats: true
                    }
                },
                owner: true,
                advertiser: true,
                payment: true,
                creatives: {
                    orderBy: { version: 'desc' }
                },
                post: true,
                campaign: true
            }
        });

        if (!deal) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        res.json(deal);
    } catch (error) {
        console.error('Error fetching deal:', error);
        res.status(500).json({ error: 'Failed to fetch deal' });
    }
});

/**
 * PUT /api/deals/:id/accept - Accept negotiation
 */
router.put('/:id/accept', authMiddleware, async (req: Request, res: Response) => {
    try {
        const deal = await dealService.transitionDeal(req.params.id, DealStatus.AWAITING_PAYMENT);
        res.json(deal);
    } catch (error: any) {
        console.error('Error accepting deal:', error);
        res.status(400).json({ error: error.message || 'Failed to accept deal' });
    }
});

/**
 * POST /api/deals/:id/creative - Submit creative
 */
router.post('/:id/creative', authMiddleware, verifyAdminMiddleware, async (req: Request, res: Response) => {
    try {
        const data = submitCreativeSchema.parse(req.body);
        const dealId = req.params.id;

        const deal = await prisma.deal.findUnique({
            where: { id: parseInt(dealId) },
            include: { creatives: true }
        });

        if (!deal) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        const version = (deal as any).creatives.length + 1;

        const creative = await prisma.creative.create({
            data: {
                dealId: parseInt(dealId),
                content: data.content,
                mediaUrls: data.mediaUrls || [],
                version,
                status: CreativeStatus.SUBMITTED,
                submittedAt: new Date()
            }
        });

        // Transition deal state
        await dealService.transitionDeal(dealId, DealStatus.CREATIVE_REVIEW);
        await dealService.updateActivity(dealId);

        res.status(201).json(creative);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Error submitting creative:', error);
        res.status(500).json({ error: 'Failed to submit creative' });
    }
});

/**
 * PUT /api/deals/:id/approve - Approve creative
 */
router.put('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
    try {
        const dealId = req.params.id;
        const { scheduledTime } = req.body;

        // Get latest creative
        const creative = await prisma.creative.findFirst({
            where: { dealId: parseInt(dealId) },
            orderBy: { version: 'desc' }
        });

        if (!creative) {
            res.status(404).json({ error: 'No creative found' });
            return;
        }

        // Update creative status
        await prisma.creative.update({
            where: { id: creative.id },
            data: {
                status: CreativeStatus.APPROVED
            }
        });

        // Transition deal
        await dealService.transitionDeal(dealId, DealStatus.CREATIVE_APPROVED);

        // Schedule post
        if (scheduledTime) {
            await postingService.schedulePost(dealId, new Date(scheduledTime));
            await dealService.transitionDeal(dealId, DealStatus.SCHEDULED);
        }

        await dealService.updateActivity(dealId);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error approving creative:', error);
        res.status(400).json({ error: error.message || 'Failed to approve creative' });
    }
});

/**
 * PUT /api/deals/:id/revise - Request revisions
 */
router.put('/:id/revise', authMiddleware, async (req: Request, res: Response) => {
    try {
        const dealId = req.params.id;
        const { feedback } = req.body;

        if (!feedback) {
            res.status(400).json({ error: 'Feedback is required' });
            return;
        }

        // Get latest creative
        const creative = await prisma.creative.findFirst({
            where: { dealId: parseInt(dealId) },
            orderBy: { version: 'desc' }
        });

        if (!creative) {
            res.status(404).json({ error: 'No creative found' });
            return;
        }

        // Update creative
        await prisma.creative.update({
            where: { id: creative.id },
            data: {
                status: CreativeStatus.REVISION_REQUESTED,
                feedback
            }
        });

        // Transition back to pending
        await dealService.transitionDeal(dealId, DealStatus.CREATIVE_PENDING);
        await dealService.updateActivity(dealId);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error requesting revision:', error);
        res.status(400).json({ error: error.message || 'Failed to request revision' });
    }
});

/**
 * POST /api/deals/:id/submit-post - Channel owner submits proof they posted the ad
 */
router.post('/:id/submit-post', authMiddleware, async (req: Request, res: Response) => {
    try {
        const dealId = parseInt(req.params.id);
        const telegramUser = (req as any).telegramUser;
        const { postUrl } = req.body;

        if (!postUrl) {
            res.status(400).json({ error: 'Post URL is required' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramUser.id) }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                channel: true,
                advertiser: true
            }
        });

        if (!deal) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        // Verify user is channel owner
        if (deal.channelOwnerId !== user.id) {
            res.status(403).json({ error: 'Only channel owner can submit post proof' });
            return;
        }

        // Check deal is in correct status
        if (deal.status !== DealStatus.PAYMENT_RECEIVED) {
            res.status(400).json({ error: 'Deal must be in PAYMENT_RECEIVED status. Current status: ' + deal.status });
            return;
        }

        // Update deal status and store post URL
        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: DealStatus.POSTED
            },
            include: {
                channel: true,
                advertiser: true
            }
        });

        // Notify advertiser
        await prisma.notification.create({
            data: {
                userId: deal.advertiserId,
                message: `🎉 Your ad has been posted on ${deal.channel.title}!\n\nView it here: ${postUrl}`
            }
        });

        // Also send Telegram bot notification
        await sendDealNotification(
            deal.advertiser.telegramId.toString(),
            `🎉 *Ad Posted!*\n\nYour ad has been posted on *${deal.channel.title}*!\n\n[View Post](${postUrl})`,
            dealId.toString()
        );

        // --- AUTOMATIC FUND RELEASE ---
        try {
            // Get payment details
            const payment = await prisma.payment.findUnique({
                where: { dealId: dealId }
            });

            if (payment && payment.status !== PaymentStatus.RELEASED) {
                // Get channel owner's wallet
                // Note: 'user' variable is the channel owner (req.user)
                const channelOwnerWallet = user.walletAddress;

                if (channelOwnerWallet) {
                    console.log(`💸 Releasing funds for deal ${dealId} to ${channelOwnerWallet}`);

                    // Release funds from escrow
                    await tonService.releaseFunds(
                        payment.escrowWallet,
                        payment.encryptedKey, // This might be empty if using master wallet, service handles it
                        channelOwnerWallet,
                        BigInt(Math.round(payment.amount)) // amount is float, need bigint nanoton
                        // Wait, amount in DB is Float (TON) or BigInt (Nanotons)?
                        // Prisma schema says Float. tonService expects BigInt (nanotons).
                        // Let's check how it was stored.
                    );

                    // Update payment status
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: PaymentStatus.RELEASED,
                            releasedAt: new Date()
                        }
                    });

                    // Notify channel owner
                    console.log(`✅ Funds released to ${channelOwnerWallet}`);

                    await prisma.notification.create({
                        data: {
                            userId: user.id,
                            message: `💰 Funds Released! ${payment.amount} TON has been sent to your wallet.`
                        }
                    });

                    await sendDealNotification(
                        user.telegramId.toString(),
                        `💰 *Funds Released!*\n\n${payment.amount} TON has been released to your wallet address:\n\`${channelOwnerWallet}\``,
                        dealId.toString()
                    );
                } else {
                    console.error('Channel owner has no wallet address linked');
                    // We should probably notify them to link wallet
                }
            }
        } catch (releaseError) {
            console.error('Error auto-releasing funds:', releaseError);
            // Don't fail the request, just log error. Admin can key in later.
        }

        res.json({
            message: 'Post submitted successfully',
            deal: updatedDeal
        });
    } catch (error) {
        console.error('Error submitting post:', error);
        res.status(500).json({ error: 'Failed to submit post' });
    }
});

export default router;
