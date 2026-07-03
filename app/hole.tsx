import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { AggressionLevel, CourseIntelligenceMemory, PinLocation } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { PrimaryButton, Segmented } from '@/ui/components';

const PINS: readonly PinLocation[] = ['front', 'middle', 'back', 'left', 'right'];
const AGGRESSION: readonly AggressionLevel[] = ['conservative', 'neutral', 'aggressive'];

/** Per-Hole Start (step 22): hole #, course intel, pin + aggression, Tee/Approach entry. */
export default function HoleScreen() {
  const { state, repos } = useSessionContext();
  const [pin, setPin] = useState<PinLocation>('middle');
  const [aggression, setAggression] = useState<AggressionLevel>(state?.round.aggressionDefault ?? 'neutral');
  const [memory, setMemory] = useState<CourseIntelligenceMemory>();

  const courseId = state?.round.courseId;
  const holeNumber = state?.holeNumber ?? 1;

  useEffect(() => {
    // Course intelligence keys off a seeded Hole row; none exist yet, so this is
    // an empty state until course seeding lands. ponytail: render empty, wire later.
    if (!courseId) return;
    (async () => {
      const holes = await repos.courses.listHoles(courseId);
      const hole = holes.find((h) => h.number === holeNumber);
      if (!hole) return;
      const intel = await repos.courses.getCourseIntelligence(hole.id);
      setMemory(intel?.memory);
    })();
  }, [repos, courseId, holeNumber]);

  if (!state) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-slate-500">No active round.</Text>
        <PrimaryButton label="New round" onPress={() => router.replace('/setup')} />
      </View>
    );
  }

  const goShot = (kind: 'tee' | 'approach') =>
    router.push({ pathname: '/shot', params: { kind, pin, aggression } });

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6">
      <Text className="mb-1 text-sm font-medium text-slate-500">Hole</Text>
      <Text className="mb-6 text-4xl font-semibold text-slate-900">{holeNumber}</Text>

      <Text className="mb-2 text-sm font-medium text-slate-600">Course notes</Text>
      {memory?.greenIntel || memory?.conditionNotes ? (
        <Text className="mb-4 text-slate-700">{memory.greenIntel ?? memory.conditionNotes}</Text>
      ) : (
        <Text className="mb-4 text-slate-400">No stored intelligence for this hole yet.</Text>
      )}

      <Segmented label="Pin location" value={pin} options={PINS} onChange={setPin} />
      <Segmented label="Aggression (override)" value={aggression} options={AGGRESSION} onChange={setAggression} />

      <PrimaryButton label="Tee shot" onPress={() => goShot('tee')} />
      <View className="h-2" />
      <PrimaryButton label="Approach" onPress={() => goShot('approach')} />

      <View className="h-6" />
      <Text
        accessibilityRole="link"
        onPress={() => router.push('/review')}
        className="text-center text-emerald-700"
      >
        Finish round & review →
      </Text>
    </ScrollView>
  );
}
