import { Router, Request, Response } from 'express';
import { PrismaClient, DealStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { tonService } from '../services/ton.service';
import { dealService } from '../services/deal.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/payments/initiate - Initiate payment for deal
 */
router.post('/initiate', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { dealId } = req.body;

        if (!dealId) {
            res.status(400).json({ error: 'Deal ID required' });
            return;
        }

        // Get deal
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { payment: true }
        });

        if (!deal) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        if (deal.payment) {
            res.status(400).json({ error: 'Payment already initiated' });
            return;
        }

        if (deal.status !== DealStatus.AWAITING_PAYMENT) {
            res.status(400).json({ error: 'Deal not ready for payment' });
            return;
        }

        // Generate escrow wallet
        const { address, encryptedKey } = await tonService.generateDealWallet();

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                dealId,
                escrowWallet: address,
                encryptedKey,
                amount: deal.agreedPrice
            }
        });

        res.status(201).json({
            paymentAddress: address,
            amount: deal.agreedPrice,
            amountTON: tonService.fromNanoton(BigInt(deal.agreedPrice))
        });
    } catch (error) {
        console.error('Error initiating payment:', error);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

/**
 * GET /api/payments/:dealId/status - Check payment status
 */
router.get('/:dealId/status', authMiddleware, async (req: Request, res: Response) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { dealId: parseInt(req.params.dealId) }
        });

        if (!payment) {
            res.status(404).json({ error: 'Payment not found' });
            return;
        }

        // Check blockchain for payment
        if (payment.status === 'PENDING') {
            const isPaid = await tonService.checkPayment(
                payment.escrowWallet,
                BigInt(payment.amount)
            );

            if (isPaid) {
                // Update payment status
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'PAID',
                        paidAt: new Date()
                    }
                });

                // Transition deal
                await dealService.transitionDeal(req.params.dealId, DealStatus.PAYMENT_RECEIVED);

                res.json({ isPaid: true, paidAt: new Date() });
                return;
            }
        }

        res.json({
            isPaid: payment.status === 'PAID' || payment.status === 'RELEASED',
            paidAt: payment.paidAt,
            isReleased: payment.status === 'RELEASED',
            isRefunded: payment.status === 'REFUNDED'
        });
    } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({ error: 'Failed to check payment status' });
    }
});

/**
 * POST /api/payments/webhook - TON payment webhook (for future integration)
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        // This would be implemented when using a TON payment provider
        // that supports webhooks for payment notifications

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * POST /api/payments/:dealId/release - Release funds (internal - called by verification job)
 */
router.post('/:dealId/release', async (req: Request, res: Response) => {
    try {
        const { dealId } = req.params;
        const { internalKey } = req.body;

        // Add internal API key verification for security
        if (internalKey !== process.env.INTERNAL_API_KEY) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        const deal = await prisma.deal.findUnique({
            where: { id: parseInt(dealId) },
            include: {
                payment: true,
                owner: true
            }
        });

        if (!deal || !deal.payment) {
            res.status(404).json({ error: 'Deal or payment not found' });
            return;
        }

        if (deal.payment.status === 'RELEASED') {
            res.status(400).json({ error: 'Funds already released' });
            return;
        }

        // Get owner's wallet address (would need to be stored in profile)
        // For now, we'll use a placeholder
        const ownerWalletAddress = 'OWNER_WALLET_ADDRESS'; // TODO: Implement user wallet storage

        // Release funds
        await tonService.releaseFunds(
            deal.payment.escrowWallet,
            deal.payment.encryptedKey,
            ownerWalletAddress,
            BigInt(deal.payment.amount)
        );

        // Update payment
        await prisma.payment.update({
            where: { id: deal.payment.id },
            data: {
                status: 'RELEASED',
                releasedAt: new Date()
            }
        });

        // Complete deal
        await dealService.transitionDeal(dealId, DealStatus.COMPLETED);

        res.json({ success: true });
    } catch (error) {
        console.error('Error releasing funds:', error);
        res.status(500).json({ error: 'Failed to release funds' });
    }
});

export default router;
