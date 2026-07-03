import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Round } from '@/core';
import type { SyncStatus } from '@/sync';
import { useSessionContext } from '@/ui/session-provider';
import { PrimaryButton, LinkText } from '@/ui/components';

export default function HomeScreen() {
  const { repos, syncStatus, resumeRound } = useSessionContext();
  const [inProgress, setInProgress] = useState<Round>();

  // Crash-safe resume (step 30): offer to pick up the exact hole/shot of any
  // round that never completed. Purely local — zero network involved.
  useEffect(() => {
    void repos.rounds.findInProgressRound().then(setInProgress);
  }, [repos]);

  return (
    <View className="flex-1 items-center justify-center bg-ink px-6">
      <Text className="text-4xl font-bold text-fg">AI Caddie</Text>
      <SyncBadge status={syncStatus} />
      <View className="mt-10 w-full max-w-xs">
        {inProgress ? (
          <PrimaryButton
            label="Resume round"
            onPress={async () => {
              if (await resumeRound(inProgress.id)) router.push('/hole');
            }}
          />
        ) : null}
        <PrimaryButton label="Start round" onPress={() => router.push('/setup')} />
        <View className="h-3" />
        <LinkText label="Player profile" onPress={() => router.push('/profile')} />
      </View>
    </View>
  );
}

const BADGE: Record<SyncStatus, { label: string; dot: string; text: string }> = {
  synced: { label: 'Synced', dot: 'bg-accent', text: 'text-accent' },
  pending: { label: 'Pending', dot: 'bg-amber-400', text: 'text-amber-300' },
  offline: { label: 'Offline', dot: 'bg-fg-dim', text: 'text-fg-muted' },
};

/** Unobtrusive sync status (step 19), driven by the provider's reconcile loop. */
function SyncBadge({ status }: { status: SyncStatus }) {
  const style = BADGE[status];
  return (
    <View accessibilityLabel={`Sync status: ${style.label}`} className="mt-4 flex-row items-center gap-2">
      <View className={`h-2 w-2 rounded-full ${style.dot}`} />
      <Text className={`text-sm ${style.text}`}>{style.label}</Text>
    </View>
  );
}
