import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { deriveStatus, type SyncStatus } from '@/sync';
import { convex } from './convex';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-semibold text-slate-900">AI Caddie</Text>
      <SyncBadge />
    </View>
  );
}

const BADGE: Record<SyncStatus, { label: string; dot: string; text: string }> = {
  synced: { label: 'Synced', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  pending: { label: 'Pending', dot: 'bg-amber-500', text: 'text-amber-700' },
  offline: { label: 'Offline', dot: 'bg-slate-400', text: 'text-slate-500' },
};

/** Unobtrusive sync status (blueprint step 19). Reads local; sync is additive. */
function SyncBadge() {
  const status = useSyncStatus();
  const style = BADGE[status];
  return (
    <View className="mt-4 flex-row items-center gap-2">
      <View className={`h-2 w-2 rounded-full ${style.dot}`} />
      <Text className={`text-sm ${style.text}`}>{style.label}</Text>
    </View>
  );
}

/**
 * Sync status from the live Convex connection. Offline whenever the socket is
 * down or no client is configured. pendingCount is 0 until the on-device
 * reconcile loop lands.
 * ponytail: poll connectionState() rather than wire a subscription — a 2s tick is
 * plenty for a status dot; swap to an event subscription only if it ever matters.
 */
function useSyncStatus(): SyncStatus {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = convex;
    if (!client) return; // no client → stays disconnected → offline
    const tick = () => setConnected(client.connectionState().isWebSocketConnected);
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  return deriveStatus({ lastError: !connected, pendingCount: 0 });
}
