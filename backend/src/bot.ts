import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let bot: TelegramBot;

export const initBot = async (): Promise<TelegramBot> => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    bot = new TelegramBot(token, { polling: true });

    // Start command
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const telegramId = msg.from?.id.toString();

        if (!telegramId) return;

        // Create or update user
        await prisma.user.upsert({
            where: { telegramId },
            update: {
                username: msg.from?.username,
                firstName: msg.from?.first_name,
                lastName: msg.from?.last_name
            },
            create: {
                telegramId,
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

    console.log('Telegram Bot is listening...');
    return bot;
};

export const getBot = (): TelegramBot => {
    if (!bot) {
        throw new Error('Bot not initialized. Call initBot() first.');
    }
    return bot;
};

export const sendDealNotification = async (
    telegramId: string,
    message: string,
    dealId: string
): Promise<void> => {
    try {
        const chatId = parseInt(telegramId);
        await bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '📋 View Deal', web_app: { url: `${process.env.TELEGRAM_MINI_APP_URL}/deals/${dealId}` } }
                ]]
            }
        });
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
};
