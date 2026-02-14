import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { ArrowLeft, CheckCircle, Send, Edit, ArrowRight } from 'lucide-react';
import { Spinner } from '@telegram-apps/telegram-ui';

interface Deal {
    id: string;
    status: string;
    channel: {
        title: string;
        username?: string;
    };
    agreedPrice: number;
    adFormat: string;
    scheduledPostTime?: string;
    owner: { username?: string; firstName?: string; telegramId: string | number };
    advertiser: { username?: string; firstName?: string; telegramId: string | number };
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
    const { user } = useTelegramWebApp();
    const [deal, setDeal] = useState<Deal | null>(null);
    const [loading, setLoading] = useState(true);
    const [creativeContent, setCreativeContent] = useState('');
    const [feedback, setFeedback] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [tonConnectUI] = useTonConnectUI();

    // Determine roles
    const isAdvertiser = deal && user ? String(deal.advertiser.telegramId) === String(user.id) : false;
    const isChannelOwner = deal && user ? String(deal.owner.telegramId) === String(user.id) : false;

    const handlePayment = async () => {
        if (!deal) return;

        setActionLoading(true);
        try {
            // Step 1: Initiate payment to get unique escrow wallet address
            const initiateResponse = await api.payments.initiate(deal.id);
            const { paymentAddress, amountTON } = initiateResponse.data;

            console.log(`Payment Address: ${paymentAddress}, Amount: ${amountTON} TON`);

            // Step 2: Send payment to the escrow wallet using TON Connect
            const amount = toNano(amountTON.toString());

            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
                messages: [
                    {
                        address: paymentAddress,
                        amount: amount.toString()
                    }
                ]
            };

            // Send transaction via TON Connect
            await tonConnectUI.sendTransaction(transaction);

            // Step 3: Reload deal to check status
            await loadDeal();
            alert('Payment sent! Waiting for confirmation...');
        } catch (error: any) {
            console.error('Payment failed:', error);
            alert(error.message || 'Payment failed. Please try again.');
        } finally {
            setActionLoading(false);
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
        setActionLoading(true);
        try {
            await api.deals.accept(id!);
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to accept deal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmitCreative = async () => {
        if (!creativeContent.trim()) return;
        setActionLoading(true);

        try {
            await api.deals.submitCreative(id!, { content: creativeContent, mediaUrls: [] });
            setCreativeContent('');
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to submit creative');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveCreative = async () => {
        setActionLoading(true);
        try {
            await api.deals.approve(id!, {});
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to approve creative');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!feedback.trim()) return;
        setActionLoading(true);

        try {
            await api.deals.revise(id!, { feedback });
            setFeedback('');
            loadDeal();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to request revision');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Spinner size="l" />
            </div>
        );
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
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</span>
                        <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {deal.status.replace(/_/g, ' ')}
                        </span>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Deal Created</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {(deal.agreedPrice / 1000000000).toFixed(2)} TON for {deal.adFormat}
                                </p>
                            </div>
                        </div>

                        {deal.payment?.isPaid && (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-white">Payment Received</p>
                                    <p className="text-gray-600 dark:text-gray-400">Escrow Secured</p>
                                </div>
                            </div>
                        )}

                        {latestCreative && (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">Creative Submitted</p>
                                    <p className="text-gray-600 dark:text-gray-400">Version {latestCreative.version}</p>
                                </div>
                            </div>
                        )}

                        {deal.post && (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">Post Published</p>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {new Date(deal.post.postedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Section - Only for Advertiser */}
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

                        {isAdvertiser ? (
                            <button
                                onClick={handlePayment}
                                disabled={actionLoading}
                                className="w-full bg-[#0088cc] text-white py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {actionLoading ? (
                                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                ) : (
                                    <>
                                        <span>Pay with TON</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="text-sm text-center text-gray-500 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-lg">
                                Waiting for Advertiser to pay
                            </div>
                        )}



                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                            Funds are held safely in the smart contract until the ad is posted.
                        </p>
                    </div>
                </div>
            )}

            {/* Creative Section - Only for Channel Owner */}
            {deal.status === 'CREATIVE_PENDING' && (
                <div className="p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-3">Submit Post Content</h3>
                        {isChannelOwner ? (
                            <>
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
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Spinner size="s" /> : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Submit for Review
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500 text-center">Waiting for Channel Owner to submit content.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Creative Review - Only for Advertiser */}
            {latestCreative && deal.status === 'CREATIVE_REVIEW' && (
                <div className="p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-2">Content for Review</h3>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mb-4">
                            <p className="whitespace-pre-wrap">{latestCreative.content}</p>
                        </div>

                        {isAdvertiser ? (
                            <div className="space-y-3">
                                <button
                                    onClick={handleApproveCreative}
                                    className="w-full bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Spinner size="s" /> : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Approve & Schedule
                                        </>
                                    )}
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
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? <Spinner size="s" /> : (
                                            <>
                                                <Edit className="w-4 h-4" />
                                                Request Revision
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center">Waiting for Advertiser to review.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Negotiation - Only for Channel Owner to Accept */}
            {deal.status === 'NEGOTIATING' && (
                <div className="p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-3">Accept Deal?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Confirm the deal terms to proceed to payment
                        </p>
                        {isChannelOwner ? (
                            <button
                                onClick={handleAcceptDeal}
                                className="w-full tg-button py-2 rounded-lg flex items-center justify-center"
                                disabled={actionLoading}
                            >
                                {actionLoading ? <Spinner size="s" /> : 'Accept Deal'}
                            </button>
                        ) : (
                            <div className="text-sm text-center text-gray-500 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-lg">
                                Waiting for Channel Owner to accept
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
