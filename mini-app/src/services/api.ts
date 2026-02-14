import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://telegram-ads-marketplace-mvp.onrender.com/api';

let telegramInitData = '';

if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    telegramInitData = window.Telegram.WebApp.initData;
}

const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': telegramInitData
    }
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('Authentication failed');
        }
        return Promise.reject(error);
    }
);

export const api = {
    // Channels
    channels: {
        list: (params?: any) => apiClient.get('/channels', { params }),
        create: (data: any) => apiClient.post('/channels', data),
        getStats: (id: string) => apiClient.get(`/channels/${id}/stats`),
        updatePricing: (id: string, data: any) => apiClient.put(`/channels/${id}/pricing`, data),
        addAdmins: (id: string) => apiClient.post(`/channels/${id}/admins`)
    },

    // Campaigns
    campaigns: {
        list: (params?: any) => apiClient.get('/campaigns', { params }),
        browse: (params?: any) => apiClient.get('/campaigns/browse', { params }),
        create: (data: any) => apiClient.post('/campaigns', data),
        apply: (id: string, data: any) => apiClient.post(`/campaigns/${id}/apply`, data),
        getApplications: (id: string) => apiClient.get(`/campaigns/${id}/applications`)
    },

    // Deals
    deals: {
        list: () => apiClient.get('/deals'),
        create: (data: any) => apiClient.post('/deals', data),
        get: (id: string) => apiClient.get(`/deals/${id}`),
        accept: (id: string) => apiClient.put(`/deals/${id}/accept`),
        submitCreative: (id: string, data: any) => apiClient.post(`/deals/${id}/creative`, data),
        approve: (id: string, data: any) => apiClient.put(`/deals/${id}/approve`, data),
        revise: (id: string, data: any) => apiClient.put(`/deals/${id}/revise`, data),
        submitPost: (id: string, postUrl: string) => apiClient.post(`/deals/${id}/submit-post`, { postUrl })
    },

    // Payments
    payments: {
        initiate: (dealId: string) => apiClient.post('/payments/initiate', { dealId }),
        markSent: (dealId: string) => apiClient.post(`/payments/${dealId}/mark-sent`),
        getStatus: (dealId: string) => apiClient.get(`/payments/${dealId}/status`),
        // Escrow endpoints
        getEscrowInfo: () => apiClient.get('/payments/escrow/info'),
        getEscrowStatus: () => apiClient.get('/payments/escrow/status'),
        getDepositLink: (amountTon: number) => apiClient.post('/payments/escrow/deposit-link', { amountTon }),
        getContractAddress: () => apiClient.get('/payments/escrow/contract')
    },

    // Notifications
    notifications: {
        list: () => apiClient.get('/notifications'),
        markAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
        markAllAsRead: () => apiClient.put('/notifications/mark-all-read')
    },

    // User
    user: {
        me: () => apiClient.get('/user/me'),
        updateWallet: (walletAddress: string) => apiClient.put('/user/wallet', { walletAddress })
    }
};

export default apiClient;
