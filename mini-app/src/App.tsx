import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useTelegramWebApp from './hooks/useTelegramWebApp';
import ChannelOwnerDashboard from './pages/ChannelOwnerDashboard';
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import DealFlow from './pages/DealFlow';
import { Spinner, AppRoot } from '@telegram-apps/telegram-ui';
import { User, Megaphone } from 'lucide-react';
import '@telegram-apps/telegram-ui/dist/styles.css';

function App() {
    const { user, webApp } = useTelegramWebApp();
    const [role, setRole] = useState<'owner' | 'advertiser' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (webApp) {
            webApp.ready();
            webApp.expand();
        }

        if (user) {
            // User detected, set default role to owner
            setRole('owner');
            setLoading(false);
        } else {
            // Fallback for browser/testing without Telegram
            const timer = setTimeout(() => {
                setRole('owner');
                setLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, webApp]);

    if (loading) {
        return (
            <AppRoot>
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
            </AppRoot>
        );
    }

    return (
        <AppRoot>
            <BrowserRouter>
                <div
                    className="min-h-screen pb-24" // Added padding bottom to prevent content hiding behind navigation
                    style={{
                        backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
                        color: webApp?.themeParams.text_color || '#000000'
                    }}
                >
                    <Routes>
                        <Route path="/" element={
                            role === 'owner' ? <Navigate to="/owner" /> : <Navigate to="/advertiser" />
                        } />
                        <Route path="/owner" element={<ChannelOwnerDashboard />} />
                        <Route path="/advertiser" element={<AdvertiserDashboard />} />
                        <Route path="/deals/:id" element={<DealFlow />} />
                    </Routes>

                    {/* Sleek Role Switcher */}
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                        <div className="flex p-1 gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-full shadow-lg">
                            <button
                                onClick={() => setRole('owner')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${role === 'owner'
                                        ? 'bg-[#0088cc] text-white shadow-md transform scale-105'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <User size={18} strokeWidth={2} />
                                <span>Owner</span>
                            </button>
                            <button
                                onClick={() => setRole('advertiser')}
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
                </div>
            </BrowserRouter>
        </AppRoot>
    );
}

export default App;
