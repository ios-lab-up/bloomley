/**
 * Whether Clerk is actually configured for this build. When false,
 * `AppProviders` deliberately mounts the app without `ClerkProvider` (dev
 * fallback for running before `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set) --
 * any component that calls a Clerk hook must check this first, since those
 * hooks throw without a `ClerkProvider` ancestor.
 */
export const isClerkConfigured = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
