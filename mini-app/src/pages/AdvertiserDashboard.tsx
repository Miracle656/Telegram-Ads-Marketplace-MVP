import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Search, Filter, TrendingUp } from 'lucide-react';

interface Campaign {
    id: string;
    title: string;
    brief: string;
    budget: number;
    targetFormats: string[];
    minSubscribers?: number;
}

interface Channel {
    id: string;
    title: string;
    username?: string;
    subscriberCount: number;
    averageViews: number;
    adFormats: any[];
}

export default function AdvertiserDashboard() {
    const navigate = useNavigate();
    const [view, setView] = useState<'campaigns' | 'channels'>('channels');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateCampaign, setShowCreateCampaign] = useState(false);

    const [newCampaign, setNewCampaign] = useState({
        title: '',
        brief: '',
        targetFormats: ['POST'],
        budget: 1,
        minSubscribers: 1000
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [campaignsRes, channelsRes] = await Promise.all([
                api.campaigns.list(),
                api.channels.list()
            ]);

            setCampaigns(campaignsRes.data.campaigns || []);
            setChannels(channelsRes.data.channels || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await api.campaigns.create({
                ...newCampaign,
                budget: newCampaign.budget * 1000000000 // Convert to nanoTON
            });
            setShowCreateCampaign(false);
            setNewCampaign({ title: '', brief: '', targetFormats: ['POST'], budget: 1, minSubscribers: 1000 });
            loadData();
        } catch (error: any) {
            console.error('Error creating campaign:', error);
            alert(error.response?.data?.error || 'Failed to create campaign');
        }
    };

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
                <h1 className="text-2xl font-bold mb-2">Advertiser Dashboard</h1>
                <p className="opacity-90">Find channels and run campaigns</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{campaigns.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Campaigns</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <Search className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">{channels.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Channels Available</p>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 p-4">
                <button
                    onClick={() => setView('channels')}
                    className={`flex-1 py-2 rounded-lg ${view === 'channels' ? 'tg-button' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                >
                    Browse Channels
                </button>
                <button
                    onClick={() => setView('campaigns')}
                    className={`flex-1 py-2 rounded-lg ${view === 'campaigns' ? 'tg-button' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                >
                    My Campaigns
                </button>
            </div>

            {view === 'channels' && (
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search channels..."
                                className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                            />
                        </div>
                        <button className="p-2 border rounded-lg dark:border-gray-600">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {channels.map((channel) => (
                            <div key={channel.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                                <h3 className="font-semibold mb-1">{channel.title}</h3>
                                {channel.username && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">@{channel.username}</p>
                                )}

                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Subscribers</p>
                                        <p className="font-semibold">{channel.subscriberCount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Views</p>
                                        <p className="font-semibold">{channel.averageViews.toLocaleString()}</p>
                                    </div>
                                </div>

                                {channel.adFormats.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pricing</p>
                                        <div className="flex flex-wrap gap-2">
                                            {channel.adFormats.map((format, idx) => (
                                                <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                    {format.format}: {(format.price / 1000000000).toFixed(2)} TON
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button className="w-full tg-button py-2 rounded-lg text-sm">
                                    Create Deal
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'campaigns' && (
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">My Campaigns</h2>
                        <button
                            onClick={() => setShowCreateCampaign(!showCreateCampaign)}
                            className="flex items-center gap-2 tg-button px-4 py-2 rounded-lg text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Create
                        </button>
                    </div>

                    {showCreateCampaign && (
                        <form onSubmit={handleCreateCampaign} className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-sm">
                            <h3 className="font-semibold mb-3">Create Campaign</h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Campaign Title"
                                    value={newCampaign.title}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    required
                                />
                                <textarea
                                    placeholder="Campaign Brief"
                                    value={newCampaign.brief}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, brief: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    rows={4}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Budget (TON)"
                                    value={newCampaign.budget}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    min="0.1"
                                    step="0.1"
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Min Subscribers"
                                    value={newCampaign.minSubscribers}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, minSubscribers: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 tg-button py-2 rounded-lg">
                                        Create Campaign
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateCampaign(false)}
                                        className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    <div className="space-y-3">
                        {campaigns.map((campaign) => (
                            <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                                <h3 className="font-semibold mb-2">{campaign.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{campaign.brief}</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold">{(campaign.budget / 1000000000).toFixed(2)} TON</span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {campaign.minSubscribers ? `${campaign.minSubscribers.toLocaleString()}+ subs` : 'No min'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
