import type { Confidence, AggressionLevel } from '@/core';

/**
 * Mental cue selection (SPEC §7): one dynamic cue from confidence, current miss
 * pattern, and aggression. Deterministic — the same input always yields the
 * same cue so a given situation feels stable to the player.
 */
export type MissPattern = 'left' | 'right' | 'short' | 'long' | 'none';

export interface MentalCueInput {
  confidence: Confidence;
  missPattern: MissPattern;
  aggression: AggressionLevel;
}

// ponytail: small deterministic lookup — richer cue logic only if it earns it.
// Miss pattern takes priority (steer away from the live tendency), then a
// confidence/aggression fallback.
const MISS_CUE: Record<MissPattern, string> = {
  left: 'feel the finish left-to-right',
  right: 'hold it through the right edge',
  short: 'trust the club, make a full swing',
  long: 'smooth tempo, take something off',
  none: '',
};

const CONFIDENCE_CUE: Record<Confidence, string> = {
  high: 'commit to the picture',
  medium: 'pick your spot and go',
  low: 'simple swing, safe target',
};

/** Single deterministic mental cue for the shot. */
export function selectMentalCue(input: MentalCueInput): string {
  const missCue = MISS_CUE[input.missPattern];
  if (missCue) return missCue;
  if (input.aggression === 'conservative') return 'play the smart shot';
  return CONFIDENCE_CUE[input.confidence];
}
