import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Users, TrendingUp, DollarSign, Settings } from 'lucide-react';

interface Channel {
    id: string;
    title: string;
    username?: string;
    subscriberCount: number;
    averageViews: number;
    isActive: boolean;
}

interface Deal {
    id: string;
    status: string;
    channel: {
        title: string;
    };
    agreedPrice: number;
    advertiser: {
        username?: string;
        firstName?: string;
    };
}

export default function ChannelOwnerDashboard() {
    const navigate = useNavigate();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddChannel, setShowAddChannel] = useState(false);

    // Form state
    const [newChannel, setNewChannel] = useState({
        telegramChannelId: '',
        title: '',
        username: '',
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // For demo purposes - in production, filter by owner
            const [channelsRes, dealsRes] = await Promise.all([
                api.channels.list(),
                api.deals.list()
            ]);

            setChannels(channelsRes.data.channels || []);
            setDeals(dealsRes.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddChannel = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await api.channels.create(newChannel);
            setShowAddChannel(false);
            setNewChannel({ telegramChannelId: '', title: '', username: '', description: '' });
            loadData();
        } catch (error: any) {
            console.error('Error adding channel:', error);
            alert(error.response?.data?.error || 'Failed to add channel');
        }
    };

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="bg-[#0088cc] text-white p-6">
                <h1 className="text-2xl font-bold mb-2">Channel Owner Dashboard</h1>
                <p className="opacity-90">Manage your channels and deals</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <Users className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{channels.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Channels</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <TrendingUp className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">{deals.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Active Deals</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <DollarSign className="w-5 h-5 text-yellow-600 mb-2" />
                    <p className="text-2xl font-bold">
                        {deals.reduce((sum, d) => sum + d.agreedPrice, 0) / 1000000000}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">TON Earned</p>
                </div>
            </div>

            {/* Channels */}
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">My Channels</h2>
                    <button
                        onClick={() => setShowAddChannel(!showAddChannel)}
                        className="flex items-center gap-2 tg-button px-4 py-2 rounded-lg text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Channel
                    </button>
                </div>

                {showAddChannel && (
                    <form onSubmit={handleAddChannel} className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-sm">
                        <h3 className="font-semibold mb-3">Add New Channel</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Channel ID (e.g., -1001234567890)"
                                value={newChannel.telegramChannelId}
                                onChange={(e) => setNewChannel({ ...newChannel, telegramChannelId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Channel Title"
                                value={newChannel.title}
                                onChange={(e) => setNewChannel({ ...newChannel, title: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Username (without @)"
                                value={newChannel.username}
                                onChange={(e) => setNewChannel({ ...newChannel, username: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                            <textarea
                                placeholder="Description"
                                value={newChannel.description}
                                onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 tg-button py-2 rounded-lg">
                                    Add Channel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddChannel(false)}
                                    className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="space-y-3">
                    {channels.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 mb-2">No channels linked yet</p>
                            <p className="text-xs text-gray-400 max-w-xs mx-auto mb-4">
                                To link a channel, add this bot as an admin to your channel, then click "Add Channel" above.
                            </p>
                        </div>
                    ) : (
                        channels.map((channel) => (
                            <div key={channel.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold">{channel.title}</h3>
                                        {channel.username && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">@{channel.username}</p>
                                        )}
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <Settings className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Subscribers</p>
                                        <p className="font-semibold">{channel.subscriberCount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Views</p>
                                        <p className="font-semibold">{channel.averageViews.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Active Deals */}
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Active Deals</h2>
                <div className="space-y-3">
                    {deals.map((deal) => (
                        <div
                            key={deal.id}
                            onClick={() => navigate(`/deals/${deal.id}`)}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold">{deal.channel.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        with @{deal.advertiser.username || deal.advertiser.firstName}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs ${deal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    deal.status === 'POSTED' ? 'bg-blue-100 text-blue-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {deal.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                {(deal.agreedPrice / 1000000000).toFixed(2)} TON
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
