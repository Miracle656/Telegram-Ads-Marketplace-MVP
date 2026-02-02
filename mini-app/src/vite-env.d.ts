/// <reference types="vite/client" />

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

interface Window {
    Telegram?: {
        WebApp: TelegramWebApp;
    };
}
