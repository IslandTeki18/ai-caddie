import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { Round } from '@/core';
import type { SyncStatus } from '@/sync';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, Header, Card, PrimaryButton, LinkText } from '@/ui/components';

/**
 * Home: every round newest-first, with the resumable in-progress round pinned
 * on top. Tapping a past round opens its read-only review. Purely local —
 * zero network involved.
 */
export default function HomeScreen() {
  const { repos, syncStatus, resumeRound } = useSessionContext();
  const [rounds, setRounds] = useState<Round[]>();
  const [inProgress, setInProgress] = useState<Round>();
  const [courseNames, setCourseNames] = useState<Map<string, string>>(new Map());

  // Refetch on focus so a round finished via "Done" shows up immediately.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [all, current] = await Promise.all([
          repos.rounds.listRounds(),
          repos.rounds.findInProgressRound(),
        ]);
        const ids = [...new Set(all.map((r) => r.courseId).filter((id): id is string => !!id))];
        const names = new Map<string, string>();
        for (const id of ids) {
          const course = await repos.courses.getCourse(id);
          if (course) names.set(id, course.name);
        }
        if (cancelled) return;
        setRounds(all);
        setInProgress(current);
        setCourseNames(names);
      })();
      return () => {
        cancelled = true;
      };
    }, [repos]),
  );

  const courseName = (r: Round) => (r.courseId && courseNames.get(r.courseId)) || 'Unknown course';
  const past = rounds?.filter((r) => r.id !== inProgress?.id) ?? [];

  return (
    <Screen>
      <Header title="AI Caddie" />
      <SyncBadge status={syncStatus} />

      <View className="mb-6 mt-4">
        <PrimaryButton label="Start round" onPress={() => router.push('/setup')} />
        <View className="h-3" />
        <LinkText label="Player profile" onPress={() => router.push('/profile')} />
      </View>

      {inProgress ? (
        <Card title="In progress">
          <Text className="mb-1 text-fg">{courseName(inProgress)}</Text>
          <Text className="text-sm text-fg-muted">{formatDate(inProgress.startedAt)}</Text>
          <PrimaryButton
            label="Resume round"
            onPress={async () => {
              if (await resumeRound(inProgress.id)) router.push('/hole');
            }}
          />
        </Card>
      ) : null}

      {rounds !== undefined && rounds.length === 0 ? (
        <Text className="text-center text-fg-dim">No rounds yet.</Text>
      ) : null}

      {past.length > 0 ? (
        <>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-fg-muted">
            Previous rounds
          </Text>
          {past.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Review round at ${courseName(r)} on ${formatDate(r.startedAt)}`}
              onPress={() => router.push({ pathname: '/review', params: { roundId: r.id } })}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
              className="mb-3 rounded-2xl border border-line bg-surface p-5"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-semibold text-fg">{courseName(r)}</Text>
                  <Text className="mt-0.5 text-sm text-fg-muted">{formatDate(r.startedAt)}</Text>
                </View>
                <Text className="text-accent">›</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
      <View className="h-6" />
    </Screen>
  );
}

const formatDate = (epochMs: number) =>
  new Date(epochMs).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const BADGE: Record<SyncStatus, { label: string; dot: string; text: string }> = {
  synced: { label: 'Synced', dot: 'bg-accent', text: 'text-accent' },
  pending: { label: 'Pending', dot: 'bg-amber-400', text: 'text-amber-300' },
  offline: { label: 'Offline', dot: 'bg-fg-dim', text: 'text-fg-muted' },
};

/** Unobtrusive sync status (step 19), driven by the provider's reconcile loop. */
function SyncBadge({ status }: { status: SyncStatus }) {
  const style = BADGE[status];
  return (
    <View accessibilityLabel={`Sync status: ${style.label}`} className="-mt-4 mb-2 flex-row items-center gap-2">
      <View className={`h-2 w-2 rounded-full ${style.dot}`} />
      <Text className={`text-sm ${style.text}`}>{style.label}</Text>
    </View>
  );
}
