import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { verifyAdminMiddleware } from '../middleware/admin-verification.middleware';
import { fetchChannelStats, verifyBotIsAdmin, getChannelAdmins } from '../services/telegram.service';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createChannelSchema = z.object({
    telegramChannelId: z.string(),
    title: z.string(),
    username: z.string().optional(),
    description: z.string().optional()
});

const updatePricingSchema = z.object({
    formats: z.array(z.object({
        format: z.enum(['POST', 'FORWARD', 'REPOST', 'STORY', 'CUSTOM']),
        customName: z.string().optional(),
        price: z.number().positive(),
        description: z.string().optional()
    }))
});

/**
 * GET /api/channels - List all active channels
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const channels = await prisma.channel.findMany({
            where: { isActive: true },
            include: {
                owner: {
                    select: { username: true, firstName: true }
                },
                adFormats: {
                    where: { isActive: true }
                }
            },
            skip,
            take: limit,
            orderBy: { subscriberCount: 'desc' }
        });

        const total = await prisma.channel.count({ where: { isActive: true } });

        res.json({
            channels,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

/**
 * POST /api/channels - Create channel listing
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const data = createChannelSchema.parse(req.body);
        const telegramUser = (req as any).telegramUser;

        // Verify bot is admin
        if (data.username) {
            const isBotAdmin = await verifyBotIsAdmin(data.username);
            if (!isBotAdmin) {
                res.status(400).json({ error: 'Please add the bot as an admin to your channel first' });
                return;
            }
        }

        // Fetch channel stats
        let stats = null;
        if (data.username) {
            try {
                stats = await fetchChannelStats(data.username);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }

        // Find or create user
        const user = await prisma.user.upsert({
            where: { telegramId: telegramUser.id },
            update: {},
            create: {
                telegramId: telegramUser.id,
                username: telegramUser.username,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName,
                role: 'CHANNEL_OWNER'
            }
        });

        // Create channel
        const channel = await prisma.channel.create({
            data: {
                telegramChannelId: data.telegramChannelId,
                title: data.title,
                username: data.username,
                description: data.description,
                ownerId: user.id,
                botAdded: data.username ? true : false,
                subscriberCount: stats?.subscriberCount || 0,
                averageViews: stats?.averageViews || 0,
                language: stats?.language,
                isPremium: stats?.isPremium || false,
                lastStatsUpdate: new Date()
            }
        });

        // Create listing
        await prisma.channelListing.create({
            data: {
                channelId: channel.id
            }
        });

        res.status(201).json(channel);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Error creating channel:', error);
        res.status(500).json({ error: 'Failed to create channel' });
    }
});

/**
 * GET /api/channels/:id/stats - Get verified channel stats
 */
router.get('/:id/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
        const channel = await prisma.channel.findUnique({
            where: { id: req.params.id }
        });

        if (!channel) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        if (!channel.username) {
            res.status(400).json({ error: 'Channel username not set' });
            return;
        }

        const stats = await fetchChannelStats(channel.username);

        // Update channel with latest stats
        await prisma.channel.update({
            where: { id: req.params.id },
            data: {
                subscriberCount: stats.subscriberCount,
                averageViews: stats.averageViews,
                language: stats.language,
                isPremium: stats.isPremium,
                lastStatsUpdate: new Date()
            }
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch channel stats' });
    }
});

/**
 * PUT /api/channels/:id/pricing - Update ad format pricing
 */
router.put('/:id/pricing', authMiddleware, verifyAdminMiddleware, async (req: Request, res: Response) => {
    try {
        const data = updatePricingSchema.parse(req.body);
        const channelId = req.params.id;

        // Delete existing formats
        await prisma.channelAdFormat.deleteMany({
            where: { channelId }
        });

        // Create new formats
        const formats = await prisma.channelAdFormat.createMany({
            data: data.formats.map(f => ({
                channelId,
                format: f.format as any,
                customName: f.customName,
                price: f.price,
                description: f.description
            }))
        });

        res.json({ success: true, count: formats.count });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Error updating pricing:', error);
        res.status(500).json({ error: 'Failed to update pricing' });
    }
});

/**
 * POST /api/channels/:id/admins - Add PR manager
 */
router.post('/:id/admins', authMiddleware, verifyAdminMiddleware, async (req: Request, res: Response) => {
    try {
        const channelId = req.params.id;
        const channel = await prisma.channel.findUnique({
            where: { id: channelId }
        });

        if (!channel || !channel.username) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        // Fetch all admins from Telegram
        const admins = await getChannelAdmins(channel.username);

        // Create or update admin records
        for (const admin of admins) {
            const user = await prisma.user.upsert({
                where: { telegramId: admin.telegramId },
                update: {},
                create: {
                    telegramId: admin.telegramId,
                    username: admin.username,
                    firstName: admin.firstName
                }
            });

            await prisma.channelAdmin.upsert({
                where: {
                    channelId_userId: {
                        channelId,
                        userId: user.id
                    }
                },
                update: {
                    canPost: admin.canPost,
                    canManage: admin.canManage,
                    lastVerified: new Date()
                },
                create: {
                    channelId,
                    userId: user.id,
                    canPost: admin.canPost,
                    canManage: admin.canManage
                }
            });
        }

        res.json({ success: true, admins: admins.length });
    } catch (error) {
        console.error('Error adding admins:', error);
        res.status(500).json({ error: 'Failed to add admins' });
    }
});

export default router;
