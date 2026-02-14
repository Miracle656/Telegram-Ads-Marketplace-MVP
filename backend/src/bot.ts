import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let bot: TelegramBot;

export const initBot = async (): Promise<TelegramBot> => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    // First, try to stop any existing webhooks/polling to clear conflicts
    const tempBot = new TelegramBot(token);
    try {
        // Use a 5s timeout to prevent hanging on startup
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Webhook deletion timed out')), 5000)
        );
        await Promise.race([tempBot.deleteWebHook(), timeoutPromise]);
        console.log('Cleared any existing webhooks');
    } catch (e) {
        console.log('Could not clear webhooks (or timed out):', e);
    }

    // Create bot - use polling only in development, or if explicitly enabled
    const usePolling = process.env.NODE_ENV !== 'production' || process.env.ENABLE_POLLING === 'true';

    bot = new TelegramBot(token, {
        polling: usePolling ? {
            autoStart: true,
            params: {
                timeout: 10
            }
        } : false
    });

    // Handle polling errors gracefully
    bot.on('polling_error', (error: any) => {
        if (error.code === 'ETELEGRAM' && error.message?.includes('409')) {
            console.log('Polling conflict detected - another instance is running. Stopping polling...');
            bot.stopPolling();
        } else {
            console.error('Polling error:', error.message);
        }
    });

    // Only set up message handlers if polling is enabled
    if (usePolling) {
        // Start command
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id.toString();

            if (!telegramId) return;

            // Create or update user
            await prisma.user.upsert({
                where: { telegramId: BigInt(telegramId) },
                update: {
                    username: msg.from?.username,
                    firstName: msg.from?.first_name,
                    lastName: msg.from?.last_name
                },
                create: {
                    telegramId: BigInt(telegramId),
                    username: msg.from?.username,
                    firstName: msg.from?.first_name,
                    lastName: msg.from?.last_name
                }
            });

            const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL || '';

            bot.sendMessage(chatId, `Welcome to Telegram Ads Marketplace! 🎯

📢 Channel owners: List your channels and earn from ads
💰 Advertisers: Find the perfect channels for your campaigns

Use the button below to open the app:`, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🚀 Open Marketplace', web_app: { url: miniAppUrl } }
                    ]]
                }
            });
        });

        // Handle messages (for negotiation)
        bot.on('message', async (msg) => {
            if (msg.text?.startsWith('/')) return; // Skip commands

            const chatId = msg.chat.id;
            console.log('Received message:', msg.text);

            // Here you can implement negotiation logic
            // For now, just acknowledge
            bot.sendMessage(chatId, 'Message received. Use the Mini App for full functionality.');
        });

        console.log('Telegram Bot is listening (polling mode)...');
    } else {
        console.log('Telegram Bot initialized (API-only mode, no polling)...');
    }

    return bot;
};

export const getBot = (): TelegramBot => {
    if (!bot) {
        throw new Error('Bot not initialized. Call initBot() first.');
    }
    return bot;
};

/**
 * Create an in-app notification and optionally send via Telegram
 */
export const createNotification = async (
    userId: number,
    message: string,
    dealId?: number,
    link?: string
): Promise<void> => {
    try {
        // Create in-app notification
        await prisma.notification.create({
            data: {
                userId,
                message,
                dealId,
                link
            }
        });
        console.log(`📬 In-app notification created for user ${userId}`);
    } catch (error) {
        console.error(`Failed to create in-app notification for user ${userId}:`, error);
    }
};

export const sendDealNotification = async (
    telegramId: string,
    message: string,
    dealId: string
): Promise<void> => {
    try {
        // Find user to get database ID
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramId) }
        });

        if (user) {
            // Create in-app notification
            await createNotification(
                user.id,
                message,
                parseInt(dealId),
                `/deals/${dealId}`
            );
        }

        // Try to send Telegram notification
        const chatId = parseInt(telegramId);
        console.log(`📤 Sending notification to user ${telegramId} (chat ${chatId})`);
        console.log(`   Message: ${message.substring(0, 50)}...`);

        await bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '📋 View Deal', web_app: { url: `${process.env.TELEGRAM_MINI_APP_URL}/deals/${dealId}` } }
                ]]
            }
        });

        console.log(`✅ Notification sent successfully to user ${telegramId}`);
    } catch (error: any) {
        console.error(`❌ Failed to send Telegram notification to user ${telegramId}:`, error.message);
        console.error(`   Error code: ${error.code}`);
        // If user hasn't started the bot, they won't receive messages
        if (error.code === 403) {
            console.error(`   → User ${telegramId} has not started the bot yet`);
            console.log(`   ℹ️  In-app notification was still created`);
        }
    }
};
