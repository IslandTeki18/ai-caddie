import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { AggressionLevel, Confidence, Elevation, Lie, PinLocation } from '@/core';
import { nearestClub, type ApproachShotInput, type TeeShotInput } from '@/session';
import { useSessionContext } from '@/ui/session-provider';
import { Screen, Eyebrow, PrimaryButton, Segmented, TextField } from '@/ui/components';

const CONFIDENCE: readonly Confidence[] = ['low', 'medium', 'high'];
const LIES: readonly Lie[] = ['tee', 'fairway', 'rough', 'sand'];
const ELEVATIONS: readonly Elevation[] = ['up', 'flat', 'down'];
const PINS: readonly PinLocation[] = ['front', 'middle', 'back', 'left', 'right'];
const AGGRESSION: readonly AggressionLevel[] = ['conservative', 'neutral', 'aggressive'];

/**
 * Shot context (2b). Every field pre-set to the usual answer so a typical shot
 * is 0–2 taps. Tee carries club + confidence only (`TeeShotInput` has no
 * elevation); approach adds yardage, lie, elevation. Pin / false front /
 * aggression carry in from the hole screen behind "Reading now · Edit".
 */
export default function ShotScreen() {
  const { state, dispatch } = useSessionContext();
  const params = useLocalSearchParams<{ kind?: string; pin?: string; aggression?: string }>();
  const kind = params.kind === 'tee' ? 'tee' : 'approach';

  const [confidence, setConfidence] = useState<Confidence>('medium');
  const [teeClub, setTeeClub] = useState('Driver');
  const [yards, setYards] = useState(150);
  const [lie, setLie] = useState<Lie>('fairway');
  const [elevation, setElevation] = useState<Elevation>('flat');
  const [pin, setPin] = useState<PinLocation>((params.pin as PinLocation) ?? 'middle');
  const [aggression, setAggression] = useState<AggressionLevel>(
    (params.aggression as AggressionLevel | undefined) ?? state?.round.aggressionDefault ?? 'neutral',
  );
  const [falseFront, setFalseFront] = useState(false);
  const [editing, setEditing] = useState(false);

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
    <Screen
      footer={
        <>
          <Text className="mb-3 text-center text-[13px] text-fg-dim">
            Every field already has your usual answer. Change what's different.
          </Text>
          <PrimaryButton large label="Get the call" onPress={submit} />
        </>
      }
    >
      <View className="mb-5 flex-row items-center gap-2">
        <Text accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} className="text-[22px] text-accent">
          ‹
        </Text>
        <Eyebrow>
          Hole {state?.holeNumber ?? '—'} · {kind === 'tee' ? 'Tee shot' : 'Approach'}
        </Eyebrow>
      </View>

      {kind === 'tee' ? (
        <TextField label="Club" value={teeClub} onChangeText={setTeeClub} />
      ) : (
        <>
          <YardageStepper value={yards} onChange={setYards} />
          <Segmented row large label="Lie" value={lie} options={LIES} onChange={setLie} />
          <Segmented row large label="Elevation" value={elevation} options={ELEVATIONS} onChange={setElevation} />
        </>
      )}
      <Segmented row large label="Confidence" value={confidence} options={CONFIDENCE} onChange={setConfidence} />

      <View className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Eyebrow>Reading now</Eyebrow>
            <Text className="mt-0.5 text-[15px] text-fg">
              Pin {pin}{kind === 'approach' ? ` · false front ${falseFront ? 'on' : 'off'}` : ''} · {aggression}
            </Text>
          </View>
          <Text accessibilityRole="button" onPress={() => setEditing((e) => !e)} className="text-sm font-semibold text-accent">
            {editing ? 'Done' : 'Edit'}
          </Text>
        </View>
        {editing ? (
          <View className="mt-4">
            <Segmented label="Pin" value={pin} options={PINS} onChange={setPin} />
            {kind === 'approach' ? (
              <Segmented
                row
                label="False front"
                value={falseFront ? 'yes' : 'no'}
                options={['no', 'yes'] as const}
                onChange={(v) => setFalseFront(v === 'yes')}
              />
            ) : null}
            <Segmented row label="Aggression" value={aggression} options={AGGRESSION} onChange={setAggression} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 120;
const HOLD_STEP = 5;

/** Centered hero yardage with ± buttons: tap ±1, hold ±5 repeating, light haptic per step. */
function YardageStepper(props: { value: number; onChange: Dispatch<SetStateAction<number>> }) {
  return (
    <View className="mb-5 items-center">
      <Eyebrow className="mb-1">Yardage to pin</Eyebrow>
      <View className="flex-row items-center gap-5">
        <StepButton glyph="−" sign={-1} onChange={props.onChange} />
        <Text className="min-w-[140px] text-center text-[76px] font-extrabold tracking-[-2px] text-fg">{props.value}</Text>
        <StepButton glyph="+" sign={1} onChange={props.onChange} />
      </View>
      <Text className="mt-1 text-[13px] text-fg-dim">laser or tap ±1 · hold for ±5</Text>
    </View>
  );
}

function StepButton(props: { glyph: string; sign: 1 | -1; onChange: Dispatch<SetStateAction<number>> }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const repeat = useRef<ReturnType<typeof setInterval>>(undefined);

  const step = (n: number) => {
    props.onChange((v) => Math.max(0, v + props.sign * n));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const stop = () => {
    clearTimeout(timer.current);
    clearInterval(repeat.current);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.sign > 0 ? 'Add yards' : 'Remove yards'}
      onPressIn={() => {
        step(1);
        timer.current = setTimeout(() => {
          repeat.current = setInterval(() => step(HOLD_STEP), HOLD_INTERVAL_MS);
        }, HOLD_DELAY_MS);
      }}
      onPressOut={stop}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
      className="h-[58px] w-[58px] items-center justify-center rounded-full border border-line bg-surface"
    >
      <Text className="text-[26px] text-fg">{props.glyph}</Text>
    </Pressable>
  );
}
