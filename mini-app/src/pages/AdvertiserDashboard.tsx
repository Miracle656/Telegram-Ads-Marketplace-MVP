import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Search, Filter, TrendingUp } from 'lucide-react';
import { Spinner } from '@telegram-apps/telegram-ui';
import useTelegramWebApp from '../hooks/useTelegramWebApp';

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
    const { user } = useTelegramWebApp();
    const [view, setView] = useState<'campaigns' | 'channels'>('campaigns');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [browseCampaigns, setBrowseCampaigns] = useState<Campaign[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateCampaign, setShowCreateCampaign] = useState(false);
    const [showCreateDeal, setShowCreateDeal] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [campaignDeals, setCampaignDeals] = useState<any[]>([]);
    const [loadingDeals, setLoadingDeals] = useState(false);
    const [createDealLoading, setCreateDealLoading] = useState(false);
    const [createCampaignLoading, setCreateCampaignLoading] = useState(false);
    const [dealPrice, setDealPrice] = useState<number>(1);

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
            const [campaignsRes, browseCampaignsRes, channelsRes] = await Promise.all([
                api.campaigns.list(),
                api.campaigns.browse(),
                api.channels.list()
            ]);

            setCampaigns(campaignsRes.data.campaigns || []);
            setBrowseCampaigns(browseCampaignsRes.data.campaigns || []);
            setChannels(channelsRes.data.channels || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCampaignClick = async (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setLoadingDeals(true);
        try {
            // Fetch all deals and filter by campaign ID
            // In a real app, we should have an endpoint for this
            const res = await api.deals.list();
            const allDeals = res.data || [];
            const filtered = allDeals.filter((d: any) => d.campaignId === campaign.id);
            setCampaignDeals(filtered);
        } catch (error) {
            console.error('Error loading deals:', error);
        } finally {
            setLoadingDeals(false);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateCampaignLoading(true);

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
        } finally {
            setCreateCampaignLoading(false);
        }
    };

    const openCreateDealModal = (channel: Channel) => {
        if (campaigns.length === 0) {
            alert('Please create a campaign first before creating a deal');
            setView('campaigns');
            setShowCreateCampaign(true);
            return;
        }

        // Set default price from channel's first ad format (in TON)
        const defaultPriceNano = channel.adFormats[0]?.price || 1000000000;
        setDealPrice(defaultPriceNano / 1000000000);
        setSelectedChannel(channel);
        setShowCreateDeal(true);
    };

    const confirmCreateDeal = async () => {
        if (!selectedChannel) return;
        setCreateDealLoading(true);

        const targetCampaignId = campaigns[0].id;

        try {
            const response = await api.deals.create({
                channelId: String(selectedChannel.id),
                advertiserId: String(user?.id || ''),
                campaignId: String(targetCampaignId),
                adFormatType: selectedChannel.adFormats[0]?.format || 'POST',
                agreedPrice: dealPrice * 1000000000 // Convert TON to nanoTON
            });

            setShowCreateDeal(false);
            setSelectedChannel(null);
            navigate(`/deals/${response.data.id}`);
        } catch (error: any) {
            console.error('Error creating deal:', error);
            alert(error.response?.data?.error || 'Failed to create deal');
        } finally {
            setCreateDealLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Spinner size="l" />
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="bg-[#0088cc] text-white p-6">
                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-2xl font-bold">Advertiser Dashboard</h1>
                    {user?.username && (
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            @{user.username}
                        </span>
                    )}
                </div>
                <p className="opacity-90">
                    {user?.firstName ? `Welcome, ${user.firstName}!` : 'Find channels and run campaigns'}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{campaigns.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Campaigns</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <Search className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{channels.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Channels Available</p>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 p-4">
                <button
                    onClick={() => setView('channels')}
                    className={`flex-1 py-2 rounded-lg ${view === 'channels' ? 'tg-button' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                >
                    Browse Channels
                </button>
                <button
                    onClick={() => setView('campaigns')}
                    className={`flex-1 py-2 rounded-lg ${view === 'campaigns' ? 'tg-button' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
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
                                className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <button className="p-2 border rounded-lg dark:border-gray-600">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {channels.map((channel) => (
                            <div key={channel.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                                <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">{channel.title}</h3>
                                {channel.username && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">@{channel.username}</p>
                                )}

                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Subscribers</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{channel.subscriberCount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Views</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{channel.averageViews.toLocaleString()}</p>
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

                                <button
                                    onClick={() => openCreateDealModal(channel)}
                                    className="w-full tg-button py-2 rounded-lg text-sm"
                                >
                                    Create Deal
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'campaigns' && (
                <div className="p-4">
                    {/* My Campaigns Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Campaigns</h2>
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
                                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Create Campaign</h3>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Campaign Title"
                                        value={newCampaign.title}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                    <textarea
                                        placeholder="Campaign Brief"
                                        value={newCampaign.brief}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, brief: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows={4}
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Budget (TON)"
                                        value={newCampaign.budget}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        min="0.1"
                                        step="0.1"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Min Subscribers"
                                        value={newCampaign.minSubscribers}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, minSubscribers: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            className="flex-1 tg-button py-2 rounded-lg flex items-center justify-center"
                                            disabled={createCampaignLoading}
                                        >
                                            {createCampaignLoading ? <Spinner size="s" /> : 'Create Campaign'}
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
                            {campaigns.length > 0 ? (
                                campaigns.map((campaign) => (
                                    <div
                                        key={campaign.id}
                                        onClick={() => handleCampaignClick(campaign)}
                                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                                    >
                                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{campaign.title}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{campaign.brief}</p>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-900 dark:text-white">{(campaign.budget / 1000000000).toFixed(2)} TON</span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {campaign.minSubscribers ? `${campaign.minSubscribers.toLocaleString()}+ subs` : 'No min'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    No campaigns yet. Click "Create" to start!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Browse Other Campaigns Section */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Browse Campaigns</h2>
                        <div className="space-y-3">
                            {browseCampaigns.length > 0 ? (
                                browseCampaigns.map((campaign) => (
                                    <div
                                        key={campaign.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
                                    >
                                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{campaign.title}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{campaign.brief}</p>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-900 dark:text-white">{(campaign.budget / 1000000000).toFixed(2)} TON</span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {campaign.minSubscribers ? `${campaign.minSubscribers.toLocaleString()}+ subs` : 'No min'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    No other campaigns available.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Deal Modal */}
            {showCreateDeal && selectedChannel && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Create Deal</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {selectedChannel.title}
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Price (TON)</label>
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={dealPrice}
                                onChange={(e) => setDealPrice(parseFloat(e.target.value) || 1)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Ad Format</label>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedChannel.adFormats[0]?.format || 'POST'}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCreateDeal(false);
                                    setSelectedChannel(null);
                                }}
                                className="flex-1 py-2 rounded-lg border dark:border-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCreateDeal}
                                className="flex-1 tg-button py-2 rounded-lg flex items-center justify-center"
                                disabled={createDealLoading}
                            >
                                {createDealLoading ? <Spinner size="s" /> : 'Create Deal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Details Modal */}
            {selectedCampaign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedCampaign.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Budget: {(selectedCampaign.budget / 1000000000).toFixed(2)} TON
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedCampaign(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Active Deals</h4>
                        {loadingDeals ? (
                            <div className="flex justify-center p-4">
                                <Spinner size="s" />
                            </div>
                        ) : campaignDeals.length > 0 ? (
                            <div className="space-y-3">
                                {campaignDeals.map((deal) => (
                                    <div
                                        key={deal.id}
                                        onClick={() => navigate(`/deals/${deal.id}`)}
                                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {deal.channel?.title || 'Unknown Channel'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${deal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                deal.status === 'POSTED' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {deal.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {(deal.agreedPrice / 1000000000).toFixed(2)} TON
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                No deals yet. Go to "Browse Channels" to create one!
                            </p>
                        )}

                        <button
                            onClick={() => setSelectedCampaign(null)}
                            className="w-full mt-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
