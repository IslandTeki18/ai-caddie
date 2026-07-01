import { Stack } from 'expo-router';
import { ConvexProvider } from 'convex/react';
import { convex } from './convex';
import '../global.css';

export default function RootLayout() {
  const stack = <Stack screenOptions={{ headerShown: false }} />;
  // No URL configured → run without the provider; the app is fully offline-capable.
  return convex ? <ConvexProvider client={convex}>{stack}</ConvexProvider> : stack;
}
