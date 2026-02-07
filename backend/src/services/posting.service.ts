import { PrismaClient, Deal, Post, Prisma } from '@prisma/client';
import { postToChannel, verifyPost } from './telegram.service';
import cron from 'node-cron';

const prisma = new PrismaClient();

// Helper interfaces to bypass potential stale client types
interface DealWithCreatives {
    id: number;
    channelId: number;
    channel: { username: string | null };
    creatives: { content: string; mediaUrls: string[] }[];
}

interface PostWithChannel {
    id: number;
    dealId: number;
    messageId: string;
    channelId: string;
    postedAt: Date;
    verifiedAt: Date | null;
    isDeleted: boolean;
    isEdited: boolean;
    lastChecked: Date | null;
    channel: { username: string | null };
}

export class PostingService {
    /**
     * Schedule a post for future publishing
     */
    async schedulePost(
        dealId: string,
        scheduledTime: Date
    ): Promise<void> {
        await prisma.deal.update({
            where: { id: parseInt(dealId) },
            data: { scheduledPostTime: scheduledTime }
        });
    }

    /**
     * Publish post to channel
     */
    async publishPost(dealId: string): Promise<number> {
        const deal = await prisma.deal.findUnique({
            where: { id: parseInt(dealId) },
            include: {
                channel: true,
                creatives: {
                    where: { status: 'APPROVED' },
                    orderBy: { version: 'desc' },
                    take: 1
                }
            }
        }) as unknown as DealWithCreatives;

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
                dealId: parseInt(dealId),
                channelId: String(deal.channelId),
                messageId: String(messageId),
                postedAt: new Date()
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
            where: { id: parseInt(postId) },
            include: { channel: true }
        }) as unknown as PostWithChannel;

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
            parseInt(post.messageId)
        );

        if (!exists) {
            issues.push('Post has been deleted');
            await prisma.post.update({
                where: { id: parseInt(postId) },
                data: { isDeleted: true }
            });
        }

        if (isEdited) {
            issues.push('Post has been edited');
            await prisma.post.update({
                where: { id: parseInt(postId) },
                data: { isEdited: true }
            });
        }

        // Update last checked time
        await prisma.post.update({
            where: { id: parseInt(postId) },
            data: { lastChecked: new Date() }
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
            where: { dealId: parseInt(dealId) }
        }) as unknown as PostWithChannel;

        if (!post) {
            return false;
        }

        const now = new Date();
        const isComplete = post.verifiedAt !== null;

        if (isComplete && !post.isDeleted && !post.isEdited) {
            await prisma.post.update({
                where: { id: post.id },
                data: { verifiedAt: new Date() }
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
                await this.publishPost(String(deal.id));

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
