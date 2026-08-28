import { useState, type ReactNode } from 'react';
import type { Contact, Curve, DistanceResult, Quality, ShotLog, StartDirection } from '@/core';
import { Segmented } from '@/ui/components';

const START: readonly StartDirection[] = ['left', 'onLine', 'right'];
const CURVE: readonly Curve[] = ['hook', 'straight', 'fade', 'slice'];
const CONTACT: readonly Contact[] = ['thin', 'fat', 'center', 'toe', 'heel'];
const DISTANCE: readonly DistanceResult[] = ['short', 'pinHigh', 'long'];
const QUALITY: readonly Quality[] = ['good', 'neutral', 'poor'];

export type ShotResult = Omit<ShotLog, 'timestamp'>;

/** Neutral defaults: every dimension pre-selected so a full log commits in a single tap. */
export const DEFAULT_RESULT: ShotResult = {
  startDirection: 'onLine',
  curve: 'straight',
  contact: 'center',
  distance: 'pinHigh',
  quality: 'good',
};

/**
 * Shot Logging grid (2d): five full-width equal-flex rows shared by tee and
 * approach, pre-selected to neutral defaults so a full log is ≤5 taps.
 * Controlled + presentational — the owning screen holds the value and commits.
 */
export function ShotLogGrid(props: { value: ShotResult; onChange: (r: ShotResult) => void }): ReactNode {
  const set = <K extends keyof ShotResult>(k: K, v: ShotResult[K]) => props.onChange({ ...props.value, [k]: v });
  const r = props.value;
  return (
    <>
      <Segmented row large label="Start" value={r.startDirection} options={START} onChange={(v) => set('startDirection', v)} />
      <Segmented row large label="Curve" value={r.curve} options={CURVE} onChange={(v) => set('curve', v)} />
      <Segmented row large label="Contact" value={r.contact} options={CONTACT} onChange={(v) => set('contact', v)} />
      <Segmented row large label="Distance" value={r.distance} options={DISTANCE} onChange={(v) => set('distance', v)} />
      <Segmented row large label="Quality" value={r.quality} options={QUALITY} onChange={(v) => set('quality', v)} />
    </>
  );
}

/** Local state helper so a screen can own the grid value with one line. */
export function useShotResult(): [ShotResult, (r: ShotResult) => void] {
  return useState<ShotResult>(DEFAULT_RESULT);
}
