import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { AggressionLevel, CourseIntelligenceMemory, Hole, PinLocation } from '@/core';
import { LAST_HOLE } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, CenteredScreen, Header, Card, PrimaryButton, Segmented, LinkText } from '@/ui/components';

const PINS: readonly PinLocation[] = ['front', 'middle', 'back', 'left', 'right'];
const AGGRESSION: readonly AggressionLevel[] = ['conservative', 'neutral', 'aggressive'];

/** Per-Hole Start (step 22): hole selector, hole info, course intel, pin/aggression, shot entry. */
export default function HoleScreen() {
  const { state, repos, dispatch } = useSessionContext();
  const [pin, setPin] = useState<PinLocation>('middle');
  const [aggression, setAggression] = useState<AggressionLevel>(state?.round.aggressionDefault ?? 'neutral');
  const [holes, setHoles] = useState<Hole[]>([]);
  const [memory, setMemory] = useState<CourseIntelligenceMemory>();

  const courseId = state?.round.courseId;
  const holeNumber = state?.holeNumber ?? 1;
  const currentHole = useMemo(() => holes.find((h) => h.number === holeNumber), [holes, holeNumber]);
  // Chip count follows the imported course (9/18 holes); falls back to a full 18.
  const holeCount = holes.length || LAST_HOLE;

  // Load the course's holes once per course.
  useEffect(() => {
    if (!courseId) return setHoles([]);
    void repos.courses.listHoles(courseId).then(setHoles);
  }, [repos, courseId]);

  // Fetch stored intelligence for whichever hole we're on.
  useEffect(() => {
    if (!currentHole) return setMemory(undefined);
    void repos.courses.getCourseIntelligence(currentHole.id).then((intel) => setMemory(intel?.memory));
  }, [repos, currentHole]);

  if (!state) {
    return (
      <CenteredScreen>
        <Text className="text-fg-muted">No active round.</Text>
        <View className="w-full max-w-xs">
          <PrimaryButton label="New round" onPress={() => router.replace('/setup')} />
        </View>
      </CenteredScreen>
    );
  }

  const goShot = (kind: 'tee' | 'approach') =>
    router.push({ pathname: '/shot', params: { kind, pin, aggression } });

  return (
    <Screen>
      <Header eyebrow="Hole" title={String(holeNumber)} live />

      {/* Hole selector — tap any number to jump (manual hole selection). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerClassName="gap-2 pr-6"
      >
        {Array.from({ length: holeCount }, (_, i) => i + 1).map((n) => {
          const active = n === holeNumber;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`Go to hole ${n}`}
              accessibilityState={{ selected: active }}
              onPress={() => dispatch({ type: 'GOTO_HOLE', holeNumber: n })}
              className={`h-11 w-11 items-center justify-center rounded-xl border ${active ? 'border-accent bg-accent' : 'border-line bg-surface'}`}
            >
              <Text className={active ? 'font-bold text-accent-ink' : 'text-fg-muted'}>{n}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {currentHole ? (
        <View className="mb-4 flex-row gap-3">
          <Stat label="Par" value={String(currentHole.par)} accent />
          <Stat label="Yards" value={currentHole.geometry.yardage ? String(currentHole.geometry.yardage) : '—'} />
          <Stat label="Stroke idx" value={currentHole.geometry.handicap ? String(currentHole.geometry.handicap) : '—'} />
        </View>
      ) : null}

      <Card title="Course notes">
        {memory?.greenIntel || memory?.conditionNotes ? (
          <Text className="text-fg">{memory.greenIntel ?? memory.conditionNotes}</Text>
        ) : (
          <Text className="text-fg-dim">No stored intelligence for this hole yet.</Text>
        )}
      </Card>

      <Segmented label="Pin location" value={pin} options={PINS} onChange={setPin} />
      <Segmented label="Aggression (override)" value={aggression} options={AGGRESSION} onChange={setAggression} />

      <PrimaryButton label="Tee shot" onPress={() => goShot('tee')} />
      <View className="h-2" />
      <PrimaryButton label="Approach" onPress={() => goShot('approach')} />

      <View className="h-6" />
      <LinkText
        label="Finish round & review →"
        onPress={async () => {
          // Mark the round complete (persists completedAt) so it stops showing
          // as resumable on home — finishing early counts as finishing.
          await dispatch({ type: 'COMPLETE_ROUND' });
          router.push('/review');
        }}
      />
    </Screen>
  );
}

/** One labeled stat tile in the hole-info row. */
function Stat(props: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-2xl border border-line bg-surface px-4 py-3">
      <Text className="text-xs uppercase tracking-wide text-fg-muted">{props.label}</Text>
      <Text className={`text-2xl font-bold ${props.accent ? 'text-accent' : 'text-fg'}`}>{props.value}</Text>
    </View>
  );
}
