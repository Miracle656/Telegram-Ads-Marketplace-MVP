import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useTelegramWebApp from './hooks/useTelegramWebApp';
import ChannelOwnerDashboard from './pages/ChannelOwnerDashboard';
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import DealFlow from './pages/DealFlow';
import { Loader2 } from 'lucide-react';

function App() {
    const { user } = useTelegramWebApp();
    const [role, setRole] = useState<'owner' | 'advertiser' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(false);
        } else {
            // Fallback for browser/testing without Telegram
            const timer = setTimeout(() => {
                setRole('owner');
                setLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-tg-bg">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-tg-button" />
                    <p className="text-tg-text">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-tg-bg text-tg-text">
                <Routes>
                    <Route path="/" element={
                        role === 'owner' ? <Navigate to="/owner" /> : <Navigate to="/advertiser" />
                    } />
                    <Route path="/owner" element={<ChannelOwnerDashboard />} />
                    <Route path="/advertiser" element={<AdvertiserDashboard />} />
                    <Route path="/deals/:id" element={<DealFlow />} />
                </Routes>

                {/* Role switcher for demo */}
                <div className="fixed bottom-4 right-4 flex gap-2">
                    <button
                        onClick={() => setRole('owner')}
                        className={`px-4 py-2 rounded-lg text-sm ${role === 'owner' ? 'tg-button' : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        Channel Owner
                    </button>
                    <button
                        onClick={() => setRole('advertiser')}
                        className={`px-4 py-2 rounded-lg text-sm ${role === 'advertiser' ? 'tg-button' : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        Advertiser
                    </button>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
