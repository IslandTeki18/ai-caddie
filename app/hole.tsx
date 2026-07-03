import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import type { AggressionLevel, CourseIntelligenceMemory, PinLocation } from '@/core';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, CenteredScreen, Header, Card, PrimaryButton, Segmented, LinkText } from '@/ui/components';

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
      <LinkText label="Finish round & review →" onPress={() => router.push('/review')} />
    </Screen>
  );
}
