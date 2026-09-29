// `userId` (Clerk's) scopes every key to the signed-in account -- without
// it, React Query's cache would happily serve one account's cached data to
// whoever is signed in next on the same device.
export const userKeys = {
  all: ['users'] as const,
  me: (userId: string) => [...userKeys.all, 'me', userId] as const,
  notificationSettings: (userId: string) =>
    [...userKeys.all, 'notification-settings', userId] as const,
};
