import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/notifications - Get user's notifications
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

        const notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 notifications
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: user.id, isRead: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * PUT /api/notifications/:id/read - Mark notification as read
 */
router.put('/:id/read', authMiddleware, async (req: Request, res: Response) => {
    try {
        const telegramUser = (req as any).telegramUser;

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramUser.id) }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const notification = await prisma.notification.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: user.id
            }
        });

        if (!notification) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }

        const updated = await prisma.notification.update({
            where: { id: notification.id },
            data: { isRead: true }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

/**
 * PUT /api/notifications/mark-all-read - Mark all notifications as read
 */
router.put('/mark-all-read', authMiddleware, async (req: Request, res: Response) => {
    try {
        const telegramUser = (req as any).telegramUser;

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramUser.id) }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        await prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

export default router;
