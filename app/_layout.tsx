import { Stack } from 'expo-router';
import { ConvexProvider } from 'convex/react';
import { convex } from './convex';
import { SessionProvider } from './session-provider';
import '../global.css';

export default function RootLayout() {
  const stack = (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
  // No URL configured → run without the provider; the app is fully offline-capable.
  return convex ? <ConvexProvider client={convex}>{stack}</ConvexProvider> : stack;
}
