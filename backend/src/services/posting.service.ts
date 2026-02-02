import { PrismaClient } from '@prisma/client';
import { postToChannel, verifyPost } from './telegram.service';
import cron from 'node-cron';

const prisma = new PrismaClient();

export class PostingService {
    /**
     * Schedule a post for future publishing
     */
    async schedulePost(
        dealId: string,
        scheduledTime: Date
    ): Promise<void> {
        await prisma.deal.update({
            where: { id: dealId },
            data: { scheduledPostTime: scheduledTime }
        });
    }

    /**
     * Publish post to channel
     */
    async publishPost(dealId: string): Promise<number> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                channel: true,
                creatives: {
                    where: { status: 'APPROVED' },
                    orderBy: { version: 'desc' },
                    take: 1
                }
            }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        if (!deal.creatives[0]) {
            throw new Error('No approved creative found');
        }

        const creative = deal.creatives[0];
        const channelUsername = deal.channel.username;

        if (!channelUsername) {
            throw new Error('Channel username not set');
        }

        // Post to channel
        const messageId = await postToChannel(
            channelUsername,
            creative.content,
            creative.mediaUrls
        );

        // Calculate verification end time
        const verificationDuration = parseInt(
            process.env.POST_VERIFICATION_DURATION || '86400000'
        ); // 24 hours default
        const verifiedUntil = new Date(Date.now() + verificationDuration);

        // Create post record
        await prisma.post.create({
            data: {
                dealId,
                channelId: deal.channelId,
                telegramMessageId: messageId,
                verifiedUntil
            }
        });

        return messageId;
    }

    /**
     * Verify post integrity
     */
    async verifyPostIntegrity(postId: string): Promise<{
        isValid: boolean;
        issues: string[];
    }> {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: { channel: true }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        const issues: string[] = [];
        const channelUsername = post.channel.username;

        if (!channelUsername) {
            throw new Error('Channel username not set');
        }

        // Check if post exists and hasn't been edited
        const { exists, isEdited } = await verifyPost(
            channelUsername,
            post.telegramMessageId
        );

        if (!exists) {
            issues.push('Post has been deleted');
            await prisma.post.update({
                where: { id: postId },
                data: { isDeleted: true }
            });
        }

        if (isEdited) {
            issues.push('Post has been edited');
            await prisma.post.update({
                where: { id: postId },
                data: { isEdited: true }
            });
        }

        // Update last checked time
        await prisma.post.update({
            where: { id: postId },
            data: { lastCheckedAt: new Date() }
        });

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Check if post has been verified for required duration
     */
    async checkVerificationComplete(dealId: string): Promise<boolean> {
        const post = await prisma.post.findUnique({
            where: { dealId }
        });

        if (!post) {
            return false;
        }

        const now = new Date();
        const isComplete = now >= post.verifiedUntil;

        if (isComplete && !post.isDeleted && !post.isEdited) {
            await prisma.post.update({
                where: { id: post.id },
                data: { isVerified: true }
            });
            return true;
        }

        return false;
    }

    /**
     * Process scheduled posts (called by cron job)
     */
    async processScheduledPosts(): Promise<void> {
        const now = new Date();

        const scheduledDeals = await prisma.deal.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledPostTime: {
                    lte: now
                }
            }
        });

        for (const deal of scheduledDeals) {
            try {
                await this.publishPost(deal.id);

                // Update deal status
                await prisma.deal.update({
                    where: { id: deal.id },
                    data: { status: 'POSTED' }
                });

                console.log(`✅ Published post for deal ${deal.id}`);
            } catch (error) {
                console.error(`❌ Failed to publish post for deal ${deal.id}:`, error);
            }
        }
    }
}

export const postingService = new PostingService();
