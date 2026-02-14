import { Router, Request, Response } from 'express';
import { PrismaClient, DealStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { tonService, EscrowStatus } from '../services/ton.service';
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

        if ((deal as any).payment) {
            res.status(400).json({ error: 'Payment already initiated' });
            return;
        }

        if (deal.status !== DealStatus.AWAITING_PAYMENT) {
            res.status(400).json({ error: 'Deal not ready for payment' });
            return;
        }

        // Get deal with participants
        const dealWithParticipants = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                payment: true,
                channel: {
                    include: {
                        owner: true
                    }
                },
                advertiser: true
            }
        });

        if (!dealWithParticipants) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        // Verify both parties have connected wallets
        const advertiserWallet = dealWithParticipants.advertiser.walletAddress;
        const beneficiaryWallet = dealWithParticipants.channel.owner.walletAddress;

        if (!advertiserWallet) {
            res.status(400).json({ error: 'Advertiser has not connected a TON wallet' });
            return;
        }

        if (!beneficiaryWallet) {
            res.status(400).json({ error: 'Channel owner has not connected a TON wallet' });
            return;
        }

        // Use the deployed escrow contract
        const escrowAddress = tonService.getEscrowContractAddress();

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                dealId,
                escrowWallet: escrowAddress,
                encryptedKey: '', // Not needed for smart contract escrow
                amount: dealWithParticipants.agreedPrice
            }
        });

        res.status(201).json({
            paymentAddress: escrowAddress,
            amount: dealWithParticipants.agreedPrice,
            amountTON: tonService.fromNanoton(BigInt(dealWithParticipants.agreedPrice))
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
        if ((payment as any).status === 'PENDING') {
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
            isPaid: (payment as any).status === 'PAID' || (payment as any).status === 'RELEASED',
            paidAt: payment.paidAt,
            isReleased: (payment as any).status === 'RELEASED',
            isRefunded: (payment as any).status === 'REFUNDED'
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

        if (!deal || !(deal as any).payment) {
            res.status(404).json({ error: 'Deal or payment not found' });
            return;
        }

        if ((deal as any).payment.status === 'RELEASED') {
            res.status(400).json({ error: 'Funds already released' });
            return;
        }

        // Get owner's wallet address (would need to be stored in profile)
        // For now, we'll use a placeholder
        const ownerWalletAddress = 'OWNER_WALLET_ADDRESS'; // TODO: Implement user wallet storage

        // Release funds
        await tonService.releaseFunds(
            (deal as any).payment.escrowWallet,
            (deal as any).payment.encryptedKey,
            ownerWalletAddress,
            BigInt((deal as any).payment.amount)
        );

        // Update payment
        await prisma.payment.update({
            where: { id: (deal as any).payment.id },
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

// ==================== ESCROW CONTRACT ENDPOINTS ====================

/**
 * GET /api/payments/escrow/info - Get escrow contract information
 */
router.get('/escrow/info', async (req: Request, res: Response) => {
    try {
        const [status, dealId, amount] = await Promise.all([
            tonService.getEscrowStatus(),
            tonService.getEscrowDealId(),
            tonService.getEscrowAmount(),
        ]);

        res.json({
            success: true,
            data: {
                contractAddress: tonService.getEscrowContractAddress(),
                status: status,
                statusName: tonService.getEscrowStatusName(status),
                dealId: dealId.toString(),
                amount: tonService.fromNanoton(amount),
                amountNano: amount.toString(),
            }
        });
    } catch (error) {
        console.error('Error fetching escrow info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escrow information'
        });
    }
});

/**
 * GET /api/payments/escrow/status - Get current escrow status
 */
router.get('/escrow/status', async (req: Request, res: Response) => {
    try {
        const status = await tonService.getEscrowStatus();

        res.json({
            success: true,
            data: {
                status: status,
                statusName: tonService.getEscrowStatusName(status),
                isFunded: status === EscrowStatus.FUNDED,
                isCompleted: status === EscrowStatus.RELEASED || status === EscrowStatus.REFUNDED,
            }
        });
    } catch (error) {
        console.error('Error fetching escrow status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escrow status'
        });
    }
});

/**
 * POST /api/payments/escrow/deposit-link - Generate a deposit link for advertiser
 */
router.post('/escrow/deposit-link', async (req: Request, res: Response) => {
    try {
        const { amountTon } = req.body;

        if (!amountTon || typeof amountTon !== 'number' || amountTon <= 0) {
            res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be a positive number in TON.'
            });
            return;
        }

        const depositLink = tonService.generateDepositLink(amountTon);
        const contractAddress = tonService.getEscrowContractAddress();
        const amountNano = tonService.toNanoton(amountTon);

        res.json({
            success: true,
            data: {
                depositLink,
                contractAddress,
                amountTon,
                amountNano: amountNano.toString(),
                instructions: 'Open this link in Tonkeeper or scan the QR code to deposit funds into escrow.'
            }
        });
    } catch (error) {
        console.error('Error generating deposit link:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate deposit link'
        });
    }
});

/**
 * GET /api/payments/escrow/contract - Get escrow contract address
 */
router.get('/escrow/contract', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            contractAddress: tonService.getEscrowContractAddress(),
            network: process.env.TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
            explorerUrl: `https://testnet.tonscan.org/address/${tonService.getEscrowContractAddress()}`
        }
    });
});

export default router;
