import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { verifyAdminMiddleware } from '../middleware/admin-verification.middleware';
import { fetchChannelStats, verifyBotIsAdmin, getChannelAdmins, getChannelDetails } from '../services/telegram.service';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createChannelSchema = z.object({
    telegramChannelId: z.string().optional(),
    title: z.string().optional(),
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
        const ownerId = req.query.ownerId as string | undefined;

        const where: any = { isActive: true };

        // Filter by owner if specified or mine=true
        if (req.query.mine === 'true') {
            const telegramUser = (req as any).telegramUser;
            if (telegramUser) {
                const user = await prisma.user.findUnique({
                    where: { telegramId: BigInt(telegramUser.id) }
                });
                if (user) {
                    where.ownerId = user.id;
                } else {
                    // Authenticated but user not in DB? Should not happen but safe fallback
                    where.ownerId = -1;
                }
            } else {
                where.ownerId = -1;
            }
        } else if (ownerId) {
            where.ownerId = parseInt(ownerId);
        }

        const channels = await prisma.channel.findMany({
            where,
            include: {
                owner: {
                    select: { username: true, firstName: true }
                },
                adFormats: true
            },
            skip,
            take: limit,
            orderBy: { subscriberCount: 'desc' }
        });

        const total = await prisma.channel.count({ where });

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
        // @ts-ignore - telegramUser is added by authMiddleware
        const telegramUser = req.telegramUser;

        // Auto-resolve channel details if username provided
        if (data.username && !data.telegramChannelId) {
            console.log(`[Channel] Resolving channel: ${data.username}`);
            try {
                // Verify bot is admin first (and get details)
                console.log(`[Channel] Checking if bot is admin of @${data.username}...`);
                const isBotAdmin = await verifyBotIsAdmin(data.username);
                console.log(`[Channel] Bot is admin: ${isBotAdmin}`);

                if (!isBotAdmin) {
                    res.status(400).json({ error: 'Bot is not an admin of this channel. Please add @telemartadsbot as an administrator first.' });
                    return;
                }

                console.log(`[Channel] Fetching channel details for @${data.username}...`);
                const details = await getChannelDetails(data.username);
                console.log(`[Channel] Got details:`, details);

                data.telegramChannelId = details.id.toString();
                data.title = data.title || details.title || data.username;
                data.description = data.description || details.description;
                console.log(`[Channel] Resolved: ID=${data.telegramChannelId}, Title=${data.title}`);
            } catch (error: any) {
                console.error('[Channel] Error resolving channel:', error.message);
                res.status(400).json({ error: error.message || 'Could not resolve channel. Ensure bot is admin and username is correct.' });
                return;
            }
        }

        if (!data.telegramChannelId) {
            res.status(400).json({ error: 'Channel ID or Username is required' });
            return;
        }

        if (!data.title) {
            data.title = 'Untitled Channel';
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
            where: { telegramId: BigInt(telegramUser.id) },
            update: {},
            create: {
                telegramId: BigInt(telegramUser.id),
                username: telegramUser.username,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName,
                role: 'CHANNEL_OWNER'
            }
        });

        // Check if channel already exists
        const existingChannel = await prisma.channel.findFirst({
            where: { telegramChannelId: data.telegramChannelId }
        });

        if (existingChannel) {
            res.status(400).json({ error: 'Channel already registered' });
            return;
        }

        // Create channel
        const channel = await prisma.channel.create({
            data: {
                telegramId: data.telegramChannelId!,
                telegramChannelId: data.telegramChannelId!,
                title: data.title!,
                username: data.username,
                description: data.description,
                ownerId: user.id,
                botAdded: true,
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
            where: { id: parseInt(req.params.id) }
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
            where: { id: parseInt(req.params.id) },
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
            where: { channelId: parseInt(channelId) }
        });

        // Create new formats
        const formats = await prisma.channelAdFormat.createMany({
            data: data.formats.map(f => ({
                channelId: parseInt(channelId),
                format: f.format as any,
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
            where: { id: parseInt(channelId) }
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
                where: { telegramId: BigInt(admin.telegramId) },
                update: {},
                create: {
                    telegramId: BigInt(admin.telegramId),
                    username: admin.username,
                    firstName: admin.firstName
                }
            });

            await prisma.channelAdmin.upsert({
                where: {
                    channelId_userId: {
                        channelId: parseInt(channelId),
                        userId: user.id
                    }
                },
                update: {
                    canPost: admin.canPost
                },
                create: {
                    channelId: parseInt(channelId),
                    userId: user.id,
                    canPost: admin.canPost
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
