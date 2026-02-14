import { api } from '../services/api';

export interface Notification {
    id: number;
    userId: number;
    message: string;
    dealId?: number;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export const notifications = {
    list: () => api.get('/notifications'),
    markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/mark-all-read')
};
