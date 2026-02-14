import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useTelegramWebApp from './hooks/useTelegramWebApp';
import { useWalletSync } from './hooks/useWalletSync';
import ChannelOwnerDashboard from './pages/ChannelOwnerDashboard';
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import DealFlow from './pages/DealFlow';
import NotificationBell from './components/NotificationBell';
import { Spinner, AppRoot } from '@telegram-apps/telegram-ui';
import { User, Megaphone } from 'lucide-react';
import { TonConnectButton } from '@tonconnect/ui-react';
import '@telegram-apps/telegram-ui/dist/styles.css';

// Inner component that can use navigation hooks (must be inside BrowserRouter)
function AppContent() {
    const { user, webApp } = useTelegramWebApp();
    const { walletAddress } = useWalletSync(); // Sync wallet to backend
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Derive role from current path
    const role = location.pathname.startsWith('/advertiser') ? 'advertiser' : 'owner';

    useEffect(() => {
        if (webApp) {
            webApp.ready();
            webApp.expand();

            // Apply dark mode class based on Telegram theme
            if (webApp.colorScheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }

        if (user) {
            setLoading(false);
        } else {
            // Fallback for browser/testing without Telegram
            const timer = setTimeout(() => {
                setLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, webApp]);

    const handleRoleSwitch = (newRole: 'owner' | 'advertiser') => {
        if (newRole === 'owner') {
            navigate('/owner');
        } else {
            navigate('/advertiser');
        }
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-white dark:bg-black"
                style={{
                    backgroundColor: webApp?.themeParams.bg_color,
                    color: webApp?.themeParams.text_color
                }}
            >
                <div className="flex flex-col items-center">
                    <Spinner size="l" />
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen pb-24"
            style={{
                backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
                color: webApp?.themeParams.text_color || '#000000'
            }}
        >
            <Routes>
                <Route path="/" element={<Navigate to="/owner" replace />} />
                <Route path="/owner" element={<ChannelOwnerDashboard />} />
                <Route path="/advertiser" element={<AdvertiserDashboard />} />
                <Route path="/deals/:id" element={<DealFlow />} />
            </Routes>

            {/* Role Switcher */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                <div className="flex p-1 gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-full shadow-lg">
                    <button
                        onClick={() => handleRoleSwitch('owner')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${role === 'owner'
                            ? 'bg-[#0088cc] text-white shadow-md transform scale-105'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <User size={18} strokeWidth={2} />
                        <span>Owner</span>
                    </button>
                    <button
                        onClick={() => handleRoleSwitch('advertiser')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${role === 'advertiser'
                            ? 'bg-[#0088cc] text-white shadow-md transform scale-105'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Megaphone size={18} strokeWidth={2} />
                        <span>Advertiser</span>
                    </button>
                </div>
            </div>

            {/* Header with Notifications and TON Connect */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
                <NotificationBell />
                <TonConnectButton />
            </div>
        </div>
    );
}

// Main App component wraps everything in BrowserRouter
function App() {
    return (
        <AppRoot>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </AppRoot>
    );
}

export default App;
