import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { verifyUserIsAdmin } from '../services/telegram.service';

/**
 * Middleware to verify user is still an admin before financial operations
 */
export const verifyAdminMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const channelId = req.params.channelId || req.body.channelId;
        const telegramUser = (req as any).telegramUser;

        if (!channelId) {
            res.status(400).json({ error: 'Channel ID required' });
            return;
        }

        if (!telegramUser) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Get channel
        const channel = await prisma.channel.findUnique({
            where: { id: channelId }
        });

        if (!channel || !channel.username) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        // Verify user is still an admin
        const isAdmin = await verifyUserIsAdmin(channel.username, telegramUser.id, true);

        if (!isAdmin) {
            res.status(403).json({ error: 'You are no longer an admin of this channel' });
            return;
        }


        next();
    } catch (error) {
        console.error('Admin verification error:', error);
        res.status(500).json({ error: 'Failed to verify admin status' });
    }
};
