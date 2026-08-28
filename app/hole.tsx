import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { AggressionLevel, CourseIntelligenceMemory, Hole, PinLocation } from '@/core';
import { LAST_HOLE } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, CenteredScreen, Eyebrow, PrimaryButton, Segmented, LinkText } from '@/ui/components';

const PINS: readonly PinLocation[] = ['front', 'middle', 'back', 'left', 'right'];
const AGGRESSION: readonly AggressionLevel[] = ['conservative', 'neutral', 'aggressive'];
/** Hole chip width + gap, for scrolling the active chip into view. */
const CHIP_STRIDE = 44 + 8;

/** Per-Hole Start (2a): hole strip, stat row, what you know, pin/aggression, shot entry. */
export default function HoleScreen() {
  const { state, repos, dispatch } = useSessionContext();
  const [pin, setPin] = useState<PinLocation>('middle');
  const [aggression, setAggression] = useState<AggressionLevel>(state?.round.aggressionDefault ?? 'neutral');
  const [holes, setHoles] = useState<Hole[]>([]);
  const [memory, setMemory] = useState<CourseIntelligenceMemory>();
  const strip = useRef<ScrollView>(null);

  const courseId = state?.round.courseId;
  const holeNumber = state?.holeNumber ?? 1;
  const currentHole = useMemo(() => holes.find((h) => h.number === holeNumber), [holes, holeNumber]);
  // Chip count follows the imported course (9/18 holes); falls back to a full 18.
  const holeCount = holes.length || LAST_HOLE;

  useEffect(() => {
    if (!courseId) return setHoles([]);
    void repos.courses.listHoles(courseId).then(setHoles);
  }, [repos, courseId]);

  useEffect(() => {
    if (!currentHole) return setMemory(undefined);
    void repos.courses.getCourseIntelligence(currentHole.id).then((intel) => setMemory(intel?.memory));
  }, [repos, currentHole]);

  // Keep the active chip in view when the hole advances.
  useEffect(() => {
    strip.current?.scrollTo({ x: Math.max(0, (holeNumber - 2) * CHIP_STRIDE), animated: true });
  }, [holeNumber]);

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

  const facts = holeFacts(memory);
  const note = memory?.greenIntel ?? memory?.conditionNotes;

  return (
    <Screen
      footer={
        <>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton large label="Tee shot" onPress={() => goShot('tee')} />
            </View>
            <View className="flex-1">
              <PrimaryButton large outline label="Approach" onPress={() => goShot('approach')} />
            </View>
          </View>
          <LinkText
            className="mt-4 text-sm"
            label="Finish round & review →"
            onPress={async () => {
              // Mark the round complete (persists completedAt) so it stops showing
              // as resumable on home — finishing early counts as finishing.
              await dispatch({ type: 'COMPLETE_ROUND' });
              router.push('/review');
            }}
          />
        </>
      }
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-baseline gap-2">
          <Eyebrow className="text-xs tracking-[0.14em]">Hole</Eyebrow>
          <Text className="text-[44px] font-extrabold text-fg">{holeNumber}</Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1">
          <View className="h-[7px] w-[7px] rounded-full bg-accent" />
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-accent">live</Text>
        </View>
      </View>

      <ScrollView
        ref={strip}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerClassName="gap-2 pr-5"
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
          <Stat label="Index" value={currentHole.geometry.handicap ? String(currentHole.geometry.handicap) : '—'} />
        </View>
      ) : null}

      <View className="mb-4 rounded-2xl border border-line bg-surface px-[18px] py-4">
        <Eyebrow className="mb-1.5">What you know about {holeNumber}</Eyebrow>
        {note ? (
          <Text className="text-[15px] leading-[22px] text-fg">{note}</Text>
        ) : (
          <Text className="text-[15px] leading-[22px] text-fg-dim">Nothing remembered for this hole yet.</Text>
        )}
        {facts.length > 0 ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {facts.map((f) => (
              <Text key={f} className="rounded-full bg-surface-2 px-2.5 py-[5px] text-xs text-fg-muted">
                {f}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <Segmented label="Pin" value={pin} options={PINS} onChange={setPin} />
      <Segmented row label="Aggression" value={aggression} options={AGGRESSION} onChange={setAggression} />
    </Screen>
  );
}

/** Historical facts pills from remembered hole memory. Empty when nothing is stored. */
function holeFacts(m?: CourseIntelligenceMemory): string[] {
  if (!m) return [];
  return [
    m.preferredTeeClub && `Tee: ${m.preferredTeeClub}`,
    ...(m.safeMissZones ?? []).map((z) => `Safe miss: ${z}`),
    ...(m.leaveZones ?? []).map((z) => `Leave: ${z}`),
    ...(m.poorClubs ?? []).map((c) => `Avoid: ${c}`),
  ].filter((f): f is string => Boolean(f));
}

/** One labeled stat tile in the hole-info row. */
function Stat(props: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-2xl border border-line bg-surface px-3.5 py-3">
      <Eyebrow>{props.label}</Eyebrow>
      <Text className={`text-[26px] font-extrabold ${props.accent ? 'text-accent' : 'text-fg'}`}>{props.value}</Text>
    </View>
  );
}
