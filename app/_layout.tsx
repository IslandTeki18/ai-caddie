import { Stack } from 'expo-router';
import { ConvexProvider } from 'convex/react';
import { convex } from './convex';
import { createConvexSyncClient } from '@/sync/convex-client';
import { SessionProvider } from '@/ui/session-provider';
import '../global.css';

const syncClient = convex ? createConvexSyncClient(convex) : undefined;

export default function RootLayout() {
  const stack = (
    <SessionProvider syncClient={syncClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
  // No URL configured → run without the provider; the app is fully offline-capable.
  return convex ? <ConvexProvider client={convex}>{stack}</ConvexProvider> : stack;
}
