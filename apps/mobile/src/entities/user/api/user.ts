import { apiClient } from './client';
import type { NotificationSettings, PushTokenPayload, User } from '../model/types';

export const userApi = {
  me: () => apiClient.get<User>('/users/me'),

  updateMe: (payload: { display_name?: string }) =>
    apiClient.patch<User>('/users/me', payload),

  updateNotificationSettings: (payload: Partial<NotificationSettings>) =>
    apiClient.patch<NotificationSettings>('/users/me/notification-settings', payload),

  registerPushToken: (payload: PushTokenPayload) =>
    apiClient.post<{ id: string }>('/users/me/push-tokens', payload),
};
