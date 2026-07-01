import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type {
  AggressionLevel,
  Confidence,
  Elevation,
  Lie,
  PinLocation,
} from '@/core';
import { nearestClub, type ApproachShotInput, type TeeShotInput } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { Field, PrimaryButton, Segmented } from '@/ui/components';

const CONFIDENCE: readonly Confidence[] = ['low', 'medium', 'high'];
const LIES: readonly Lie[] = ['tee', 'fairway', 'rough', 'sand'];
const ELEVATIONS: readonly Elevation[] = ['up', 'flat', 'down'];
const PINS: readonly PinLocation[] = ['front', 'middle', 'back', 'left', 'right'];

/**
 * Tee / Approach input (step 23). Tee carries club + confidence only
 * (`TeeShotInput` has no elevation field — elevation stays on approach). Approach
 * adds yardage, lie, elevation, pin, false front. Dispatches SET_SHOT_CONTEXT.
 */
export default function ShotScreen() {
  const { state, dispatch } = useSessionContext();
  const params = useLocalSearchParams<{ kind?: string; pin?: string; aggression?: string }>();
  const kind = params.kind === 'tee' ? 'tee' : 'approach';
  const aggression = params.aggression as AggressionLevel | undefined;

  const [confidence, setConfidence] = useState<Confidence>('medium');
  // Tee
  const [teeClub, setTeeClub] = useState('Driver');
  // Approach
  const [yardage, setYardage] = useState('150');
  const [lie, setLie] = useState<Lie>('fairway');
  const [elevation, setElevation] = useState<Elevation>('flat');
  const [pin, setPin] = useState<PinLocation>((params.pin as PinLocation) ?? 'middle');
  const [falseFront, setFalseFront] = useState(false);

  const yards = Number(yardage) || 0;
  const club = useMemo(
    () => (kind === 'tee' ? teeClub : nearestClub(state?.baselines ?? [], yards) ?? 'wedge'),
    [kind, teeClub, state?.baselines, yards],
  );

  const submit = async () => {
    const input: TeeShotInput | ApproachShotInput =
      kind === 'tee'
        ? { kind: 'tee', club: teeClub, confidence, aggression }
        : { kind: 'approach', club, confidence, aggression, yardage: yards, lie, elevation, pin, green: { falseFront } };
    await dispatch({ type: 'SET_SHOT_CONTEXT', input });
    router.push('/recommendation');
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6">
      <Text className="mb-6 text-2xl font-semibold text-slate-900">
        {kind === 'tee' ? 'Tee shot' : 'Approach'}
      </Text>

      {kind === 'tee' ? (
        <Field label="Club">
          <TextInput
            accessibilityLabel="Club"
            value={teeClub}
            onChangeText={setTeeClub}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </Field>
      ) : (
        <>
          <Field label="Yardage">
            <TextInput
              accessibilityLabel="Yardage"
              keyboardType="numeric"
              value={yardage}
              onChangeText={setYardage}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
          <Text className="mb-4 text-sm text-slate-500">Suggested club: {club}</Text>
          <Segmented label="Lie" value={lie} options={LIES} onChange={setLie} />
          <Segmented label="Elevation" value={elevation} options={ELEVATIONS} onChange={setElevation} />
          <Segmented label="Pin" value={pin} options={PINS} onChange={setPin} />
          <Segmented
            label="False front"
            value={falseFront ? 'yes' : 'no'}
            options={['no', 'yes'] as const}
            onChange={(v) => setFalseFront(v === 'yes')}
          />
        </>
      )}

      <Segmented label="Confidence" value={confidence} options={CONFIDENCE} onChange={setConfidence} />

      <PrimaryButton label="Get recommendation" onPress={submit} />
      <View className="h-6" />
    </ScrollView>
  );
}
