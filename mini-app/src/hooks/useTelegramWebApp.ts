import { useEffect, useState } from 'react';

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: any;
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: any;
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

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

export const useTelegramWebApp = () => {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            setWebApp(tg);
            setUser(tg.initDataUnsafe.user);

            // Ready the app
            tg.ready();
            tg.expand();
        }
    }, []);

    return { webApp, user };
};

export default useTelegramWebApp;
