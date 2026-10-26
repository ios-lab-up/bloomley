import { Redirect } from 'expo-router';

import { DebugAuthScreen } from '@/screens/debug-auth';

export default function DebugAuth() {
  // File routes are always bundled, so the screen itself must refuse to
  // render outside development: it can display the live session token.
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <DebugAuthScreen />;
}
