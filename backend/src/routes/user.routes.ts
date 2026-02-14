import { Router, Request, Response } from 'express';
import prisma from '../lib/db';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * PUT /api/user/wallet - Update user's wallet address
 */
router.put('/wallet', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { walletAddress } = req.body;

        if (!walletAddress) {
            res.status(400).json({ error: 'Wallet address is required' });
            return;
        }

        // Update user's wallet address
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { walletAddress }
        });

        res.json({
            message: 'Wallet address updated successfully',
            walletAddress: updatedUser.walletAddress
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
        const userId = (req as any).userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
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
