export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  notificationSettings: () => [...userKeys.all, 'notification-settings'] as const,
};
