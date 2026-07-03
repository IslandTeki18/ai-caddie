import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConvexProvider } from 'convex/react';
import { convex } from './convex';
import { createConvexSyncClient } from '@/sync/convex-client';
import { SessionProvider } from '@/ui/session-provider';
import '../global.css';

const syncClient = convex ? createConvexSyncClient(convex) : undefined;

export default function RootLayout() {
  const stack = (
    <SessionProvider syncClient={syncClient}>
      {/* Headers are hidden app-wide, so inset every screen below the status
          bar / Dynamic Island here instead of per screen. */}
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </SessionProvider>
  );
  // No URL configured → run without the provider; the app is fully offline-capable.
  return convex ? <ConvexProvider client={convex}>{stack}</ConvexProvider> : stack;
}
