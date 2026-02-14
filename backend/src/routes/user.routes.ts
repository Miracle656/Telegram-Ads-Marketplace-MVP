import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * PUT /api/user/wallet - Update user's wallet address
 */
router.put('/wallet', authMiddleware, async (req: Request, res: Response) => {
    try {
        const telegramUser = (req as any).telegramUser;
        const { walletAddress } = req.body;

        if (!walletAddress) {
            res.status(400).json({ error: 'Wallet address is required' });
            return;
        }

        if (!telegramUser || !telegramUser.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Find or create user by telegramId
        const user = await prisma.user.upsert({
            where: { telegramId: BigInt(telegramUser.id) },
            update: { walletAddress },
            create: {
                telegramId: BigInt(telegramUser.id),
                username: telegramUser.username,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName,
                walletAddress,
                role: 'BOTH'
            }
        });

        res.json({
            message: 'Wallet address updated successfully',
            walletAddress: user.walletAddress
        });
    } catch (error) {
        console.error('Error updating wallet address:', error);
        res.status(500).json({ error: 'Failed to update wallet address' });
    }
});

/**
 * GET /api/user/me - Get current user info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const telegramUser = (req as any).telegramUser;

        if (!telegramUser || !telegramUser.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramUser.id) },
            select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
                walletAddress: true,
                role: true
            }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

export default router;
