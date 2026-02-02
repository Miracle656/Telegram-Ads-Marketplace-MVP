import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface TelegramWebAppInitData {
    user?: {
        id: number;
        first_name?: string;
        last_name?: string;
        username?: string;
    };
    auth_date: number;
    hash: string;
}

/**
 * Parse and validate Telegram Mini App initData
 */
const validateTelegramWebAppData = (initData: string): TelegramWebAppInitData | null => {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // Create data check string
        const dataCheckArr: string[] = [];
        for (const [key, value] of urlParams.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        // Calculate hash
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            return null;
        }

        // Parse user data
        const userStr = urlParams.get('user');
        const authDate = parseInt(urlParams.get('auth_date') || '0');

        return {
            user: userStr ? JSON.parse(userStr) : undefined,
            auth_date: authDate,
            hash: hash || ''
        };
    } catch (error) {
        console.error('Error validating Telegram data:', error);
        return null;
    }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const initData = req.headers['x-telegram-init-data'] as string;

        if (!initData) {
            res.status(401).json({ error: 'Missing authentication data' });
            return;
        }

        const validatedData = validateTelegramWebAppData(initData);

        if (!validatedData || !validatedData.user) {
            res.status(401).json({ error: 'Invalid authentication data' });
            return;
        }

        // Check if auth is not too old (24 hours)
        const now = Math.floor(Date.now() / 1000);
        if (now - validatedData.auth_date > 86400) {
            res.status(401).json({ error: 'Authentication data expired' });
            return;
        }

        // Attach user to request
        (req as any).telegramUser = {
            id: validatedData.user.id.toString(),
            username: validatedData.user.username,
            firstName: validatedData.user.first_name,
            lastName: validatedData.user.last_name
        };

        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication error' });
    }
};
