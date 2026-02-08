import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useEscrow } from '../hooks/useEscrow';
import { ArrowLeft, CheckCircle, Send, Edit, ArrowRight } from 'lucide-react';

interface Deal {
    id: string;
    status: string;
    channel: {
        title: string;
        username?: string;
    };
    agreedPrice: number;
    adFormatType: string;
    scheduledPostTime?: string;
    owner: { username?: string; firstName?: string };
    advertiser: { username?: string; firstName?: string };
    payment?: {
        isPaid: boolean;
        paymentAddress?: string;
    };
    creatives: Array<{
        id: string;
        content: string;
        status: string;
        feedback?: string;
        version: number;
    }>;
    post?: {
        telegramMessageId: number;
        postedAt: string;
    };
}

export default function DealFlow() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [deal, setDeal] = useState<Deal | null>(null);
    const [loading, setLoading] = useState(true);
    const [creativeContent, setCreativeContent] = useState('');
    const [feedback, setFeedback] = useState('');
    const { deposit, loading: escrowLoading, error: escrowError } = useEscrow();

    const handlePayment = async () => {
        if (!deal) return;
        try {
            // Amount in TON
            const amount = deal.agreedPrice / 1000000000;

            // Initiate payment record in backend first if not exists
            if (!deal.payment) {
                await api.payments.initiate(deal.id);
            }

            // Trigger wallet transaction
            await deposit(amount);

            // Reload deal to check status (might need polling or websocket in real app)
            loadDeal();
            alert('Payment initiated! Please wait for confirmation.');
        } catch (error) {
            console.error('Payment failed:', error);
            // Error handling is managed by hook state
        }
    };

    useEffect(() => {
        if (id) {
            loadDeal();
        }
    }, [id]);

    const loadDeal = async () => {
        try {
            const response = await api.deals.get(id!);
            setDeal(response.data);
        } catch (error) {
            console.error('Error loading deal:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptDeal = async () => {
        try {
            await api.deals.accept(id!);
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to accept deal');
        }
    };

    const handleSubmitCreative = async () => {
        if (!creativeContent.trim()) return;

        try {
            await api.deals.submitCreative(id!, { content: creativeContent, mediaUrls: [] });
            setCreativeContent('');
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to submit creative');
        }
    };

    const handleApproveCreative = async () => {
        try {
            await api.deals.approve(id!, {});
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to approve creative');
        }
    };

    const handleRequestRevision = async () => {
        if (!feedback.trim()) return;

        try {
            await api.deals.revise(id!, { feedback });
            setFeedback('');
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to request revision');
        }
    };

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    if (!deal) {
        return <div className="p-4">Deal not found</div>;
    }

    const latestCreative = deal.creatives[0];

    return (
        <div className="pb-6">
            {/* Header */}
            <div className="bg-[#0088cc] text-white p-4">
                <button onClick={() => navigate(-1)} className="mb-3">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Deal Details</h1>
                <p className="text-sm opacity-90 mt-1">{deal.channel.title}</p>
            </div>

            {/* Status Timeline */}
            <div className="p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold">Status</span>
                        <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {deal.status.replace(/_/g, ' ')}
                        </span>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <p className="font-semibold">Deal Created</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {(deal.agreedPrice / 1000000000).toFixed(2)} TON for {deal.adFormatType}
                                </p>
                            </div>
                        </div>

                        {deal.payment?.isPaid && (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Payment Received</p>
                                </div>
                            </div>
                        )}

                        {latestCreative && (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Creative Submitted</p>
                                    <p className="text-gray-600 dark:text-gray-400">Version {latestCreative.version}</p>
                                </div>
                            </div>
                        )}

                        {deal.post && (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Post Published</p>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {new Date(deal.post.postedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Section */}
            {deal.status === 'AWAITING_PAYMENT' && !deal.payment?.isPaid && (
                <div className="p-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Payment Required
                        </h3>
                        <p className="text-sm mb-4 text-gray-600 dark:text-gray-300">
                            Deposit <b>{(deal.agreedPrice / 1000000000).toFixed(2)} TON</b> to escrow to start the deal.
                        </p>

                        <button
                            onClick={handlePayment}
                            disabled={escrowLoading}
                            className="w-full bg-[#0088cc] text-white py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {escrowLoading ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    <span>Pay with TON</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        {escrowError && (
                            <p className="text-xs text-red-500 mt-2 text-center">{escrowError}</p>
                        )}

                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                            Funds are held safely in the smart contract until the ad is posted.
                        </p>
                    </div>
                </div>
            )}

            {/* Creative Section */}
            {deal.status === 'CREATIVE_PENDING' && (
                <div className="p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-3">Submit Post Content</h3>
                        <textarea
                            value={creativeContent}
                            onChange={(e) => setCreativeContent(e.target.value)}
                            placeholder="Write your post content here..."
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-3"
                            rows={6}
                        />
                        <button
                            onClick={handleSubmitCreative}
                            className="w-full tg-button py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Submit for Review
                        </button>
                    </div>
                </div>
            )}

            {/* Creative Review */}
            {latestCreative && deal.status === 'CREATIVE_REVIEW' && (
                <div className="p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-2">Content for Review</h3>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mb-4">
                            <p className="whitespace-pre-wrap">{latestCreative.content}</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleApproveCreative}
                                className="w-full bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Approve & Schedule
                            </button>

                            <div>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Request changes (optional)"
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-2"
                                    rows={3}
                                />
                                <button
                                    onClick={handleRequestRevision}
                                    className="w-full bg-orange-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Request Revision
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Negotiation */}
            {deal.status === 'NEGOTIATING' && (
                <div className="p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-3">Accept Deal?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Confirm the deal terms to proceed to payment
                        </p>
                        <button
                            onClick={handleAcceptDeal}
                            className="w-full tg-button py-2 rounded-lg"
                        >
                            Accept Deal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
