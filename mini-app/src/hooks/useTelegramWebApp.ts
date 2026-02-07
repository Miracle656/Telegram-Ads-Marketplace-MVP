import { useEffect, useState } from 'react';

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            photo_url?: string;
        };
        query_id?: string;
        auth_date?: number;
        hash?: string;
    };
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
        secondary_bg_color?: string;
    };
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    headerColor: string;
    backgroundColor: string;
    BackButton: any;
    MainButton: any;
    HapticFeedback: any;
    ready: () => void;
    expand: () => void;
    close: () => void;
    showAlert: (message: string) => void;
    showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

export interface TelegramUser {
    id: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    languageCode?: string;
    isPremium?: boolean;
    photoUrl?: string;
}

export const useTelegramWebApp = () => {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
    const [user, setUser] = useState<TelegramUser | null>(null);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            setWebApp(tg);

            // Extract detailed user information
            if (tg.initDataUnsafe.user) {
                const rawUser = tg.initDataUnsafe.user;
                setUser({
                    id: rawUser.id,
                    firstName: rawUser.first_name,
                    lastName: rawUser.last_name,
                    username: rawUser.username,
                    languageCode: rawUser.language_code,
                    isPremium: rawUser.is_premium || false,
                    photoUrl: rawUser.photo_url
                });
            }

            // Ready the app
            tg.ready();
            tg.expand();
        }
    }, []);

    return { webApp, user };
};

export default useTelegramWebApp;
