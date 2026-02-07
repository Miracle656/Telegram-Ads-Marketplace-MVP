import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useTelegramWebApp from './hooks/useTelegramWebApp';
import ChannelOwnerDashboard from './pages/ChannelOwnerDashboard';
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import DealFlow from './pages/DealFlow';
import { Spinner } from '@telegram-apps/telegram-ui';
import '@telegram-apps/telegram-ui/dist/styles.css';

function App() {
    const { user, webApp } = useTelegramWebApp();
    const [role, setRole] = useState<'owner' | 'advertiser' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            // User detected, set default role to owner
            setRole('owner');
            setLoading(false);
        } else {
            // Fallback for browser/testing without Telegram
            const timer = setTimeout(() => {
                setRole('owner');
                setLoading(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [user]);

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{
                    backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
                    color: webApp?.themeParams.text_color || '#000000'
                }}
            >
                <div className="text-center">
                    <Spinner size="l" />
                    <p className="mt-4 text-sm opacity-70">Loading your marketplace...</p>
                </div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <div
                className="min-h-screen"
                style={{
                    backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
                    color: webApp?.themeParams.text_color || '#000000'
                }}
            >
                {/* User Info Display (if available) */}
                {user && (
                    <div className="fixed top-2 left-2 z-50 text-xs opacity-50 bg-black bg-opacity-20 rounded px-2 py-1">
                        {user.username ? `@${user.username}` : user.firstName || 'User'}
                    </div>
                )}

                <Routes>
                    <Route path="/" element={
                        role === 'owner' ? <Navigate to="/owner" /> : <Navigate to="/advertiser" />
                    } />
                    <Route path="/owner" element={<ChannelOwnerDashboard />} />
                    <Route path="/advertiser" element={<AdvertiserDashboard />} />
                    <Route path="/deals/:id" element={<DealFlow />} />
                </Routes>

                {/* Enhanced Role switcher */}
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-white dark:bg-gray-800 rounded-full shadow-lg p-1">
                    <button
                        onClick={() => setRole('owner')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${role === 'owner'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        👤 Channel Owner
                    </button>
                    <button
                        onClick={() => setRole('advertiser')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${role === 'advertiser'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        📢 Advertiser
                    </button>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
