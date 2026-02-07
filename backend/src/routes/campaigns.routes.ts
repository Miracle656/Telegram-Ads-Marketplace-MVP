import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createCampaignSchema = z.object({
    title: z.string().min(3),
    brief: z.string().min(10),
    targetFormats: z.array(z.enum(['POST', 'FORWARD', 'REPOST', 'STORY', 'CUSTOM'])),
    budget: z.number().positive(),
    minSubscribers: z.number().optional(),
    minViews: z.number().optional(),
    preferredLanguage: z.string().optional()
});

/**
 * GET /api/campaigns - List campaigns with filters
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const campaigns = await prisma.campaign.findMany({
            where: { isActive: true },
            include: {
                advertiser: {
                    select: { username: true, firstName: true }
                },
                _count: {
                    select: { applications: true }
                }
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.campaign.count({ where: { isActive: true } });

        res.json({
            campaigns,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

/**
 * POST /api/campaigns - Create campaign
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const data = createCampaignSchema.parse(req.body);
        const telegramUser = (req as any).telegramUser;

        // Find or create user
        const user = await prisma.user.upsert({
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

        const campaign = await prisma.campaign.create({
            data: {
                title: data.title,
                description: data.brief, // Use brief as description
                budget: data.budget,
                preferredFormats: data.targetFormats,
                advertiserId: user.id
            }
        });

        res.status(201).json(campaign);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

/**
 * POST /api/campaigns/:id/apply - Apply to campaign
 */
router.post('/:id/apply', authMiddleware, async (req: Request, res: Response) => {
    try {
        const campaignId = req.params.id;
        const { listingId, message } = req.body;

        if (!listingId) {
            res.status(400).json({ error: 'Listing ID required' });
            return;
        }

        // Check if already applied
        const existing = await prisma.campaignApplication.findFirst({
            where: {
                campaignId: parseInt(campaignId),
                channelId: parseInt(listingId)
            }
        });

        if (existing) {
            res.status(400).json({ error: 'Already applied to this campaign' });
            return;
        }

        const application = await prisma.campaignApplication.create({
            data: {
                campaignId: parseInt(campaignId),
                channelId: parseInt(listingId),
                proposedPrice: 0, // Default price
                message
            }
        });

        res.status(201).json(application);
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({ error: 'Failed to apply to campaign' });
    }
});

/**
 * GET /api/campaigns/:id/applications - Get campaign applications
 */
router.get('/:id/applications', authMiddleware, async (req: Request, res: Response) => {
    try {
        const applications = await prisma.campaignApplication.findMany({
            where: { campaignId: parseInt(req.params.id) },
            include: {
                channel: {
                    include: {
                        adFormats: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(applications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

export default router;
