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
        console.log(`[Auth] Request to ${req.path}, initData present: ${!!initData}, length: ${initData?.length || 0}`);

        if (!initData) {
            console.log('[Auth] Missing authentication data');
            res.status(401).json({ error: 'Missing authentication data' });
            return;
        }

        const validatedData = validateTelegramWebAppData(initData);
        console.log(`[Auth] Validation result: ${validatedData ? 'valid' : 'invalid'}, user: ${validatedData?.user?.username || 'unknown'}`);

        if (!validatedData || !validatedData.user) {
            console.log('[Auth] Invalid authentication data');
            res.status(401).json({ error: 'Invalid authentication data' });
            return;
        }

        // Check if auth is not too old (24 hours)
        const now = Math.floor(Date.now() / 1000);
        const age = now - validatedData.auth_date;
        console.log(`[Auth] Auth age: ${age}s (max: 86400s)`);

        if (age > 86400) {
            console.log('[Auth] Authentication data expired');
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
        console.log(`[Auth] Authenticated user: ${validatedData.user.id} (@${validatedData.user.username})`);

        next();
    } catch (error: any) {
        console.error('[Auth] Error:', error.message);
        res.status(500).json({ error: 'Authentication error' });
    }
};
