import { useState, type ReactNode } from 'react';
import type {
  Contact,
  Curve,
  DistanceResult,
  Quality,
  ShotLog,
  StartDirection,
} from '@/core';
import { PrimaryButton, Segmented } from '@/ui/components';

const START: readonly StartDirection[] = ['left', 'onLine', 'right'];
const CURVE: readonly Curve[] = ['hook', 'straight', 'fade', 'slice'];
const CONTACT: readonly Contact[] = ['thin', 'fat', 'center', 'toe', 'heel'];
const DISTANCE: readonly DistanceResult[] = ['short', 'pinHigh', 'long'];
const QUALITY: readonly Quality[] = ['good', 'neutral', 'poor'];

/** Neutral defaults: every dimension pre-selected so a full log commits in a single tap. */
const DEFAULTS: Omit<ShotLog, 'timestamp'> = {
  startDirection: 'onLine',
  curve: 'straight',
  contact: 'center',
  distance: 'pinHigh',
  quality: 'good',
};

/**
 * Shot Logging grid (step 25): five button rows shared by tee and approach,
 * pre-selected to neutral defaults so a full log is ≤5 taps. Presentational —
 * the owning screen handles dispatch + navigation via `onLog`.
 */
export function ShotLogGrid(props: {
  onLog: (result: Omit<ShotLog, 'timestamp'>) => void;
  disabled?: boolean;
}): ReactNode {
  const [result, setResult] = useState<Omit<ShotLog, 'timestamp'>>(DEFAULTS);
  const set = <K extends keyof typeof result>(k: K, v: (typeof result)[K]) =>
    setResult((r) => ({ ...r, [k]: v }));

  return (
    <>
      <Segmented label="Start" value={result.startDirection} options={START} onChange={(v) => set('startDirection', v)} />
      <Segmented label="Curve" value={result.curve} options={CURVE} onChange={(v) => set('curve', v)} />
      <Segmented label="Contact" value={result.contact} options={CONTACT} onChange={(v) => set('contact', v)} />
      <Segmented label="Distance" value={result.distance} options={DISTANCE} onChange={(v) => set('distance', v)} />
      <Segmented label="Quality" value={result.quality} options={QUALITY} onChange={(v) => set('quality', v)} />
      <PrimaryButton
        label={props.disabled ? 'Logged' : 'Log shot'}
        onPress={() => props.onLog(result)}
        disabled={props.disabled}
      />
    </>
  );
}
