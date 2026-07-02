import type { Shot, CourseIntelligenceMemory } from '@/core';

/**
 * Course learning (SPEC §"Course learning", Phase H step 26). Pure: scans
 * accumulated per-hole shot history for patterns above a confidence threshold
 * and emits suggested per-hole memory updates. It NEVER writes strategy — every
 * output is a suggestion the player approves or rejects (session step 27).
 *
 * Detectable from the persisted shot signal (start direction, curve, contact,
 * distance, quality, club):
 *   - preferredTeeClub — a tee club that reliably produces good outcomes
 *   - poorClubs        — clubs whose outcomes are mostly poor
 *   - safeMissZones    — the safe bail side, inferred from the dominant miss side
 *   - leaveZones       — the leave that offsets a dominant distance miss
 * ponytail: conditionNotes is intentionally not derived — no per-shot weather is
 * persisted, so there is no signal for it. Add when weather is logged per shot.
 */

/** One hole's accumulated shots across rounds. `holeId` lets the caller persist. */
export interface HoleHistory {
  holeNumber: number;
  /** Present when the hole is seeded; required to persist an approved update. */
  holeId?: string;
  shots: readonly Shot[];
}

export type LearningKind = 'preferredTeeClub' | 'poorClubs' | 'safeMissZones' | 'leaveZones';

export interface SuggestedUpdate {
  holeNumber: number;
  holeId?: string;
  kind: LearningKind;
  /** The memory fields this update would merge in on approval. */
  patch: Partial<CourseIntelligenceMemory>;
  rationale: string;
  /** Dominant fraction 0..1 that cleared the threshold. */
  confidence: number;
  sampleSize: number;
}

/** Minimum shots before a pattern is trusted — below this, stay silent. */
const MIN_SAMPLE = 3;
/** Fraction of the sample that must agree for a suggestion to fire. */
const DOMINANCE = 0.6;

/** Which side a shot ends up on, from start line + curve. Neutral shots abstain. */
function missSide(shot: Shot): 'left' | 'right' | undefined {
  if (shot.startDirection === 'right' || shot.curve === 'fade' || shot.curve === 'slice') return 'right';
  if (shot.startDirection === 'left' || shot.curve === 'hook') return 'left';
  return undefined;
}

/** Dominant value in a list with its fraction, or undefined if none clears DOMINANCE. */
function dominant<T>(values: readonly T[]): { value: T; fraction: number } | undefined {
  if (values.length < MIN_SAMPLE) return undefined;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | undefined;
  let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) ((best = v), (bestCount = c));
  const fraction = bestCount / values.length;
  return fraction >= DOMINANCE ? { value: best as T, fraction } : undefined;
}

function detectHole(hole: HoleHistory): SuggestedUpdate[] {
  const out: SuggestedUpdate[] = [];
  const base = { holeNumber: hole.holeNumber, holeId: hole.holeId };
  const tee = hole.shots.filter((s) => s.kind === 'tee');
  const approach = hole.shots.filter((s) => s.kind === 'approach');

  // preferredTeeClub — the tee club with enough samples and a good-rate ≥ DOMINANCE.
  const teeByClub = new Map<string, Shot[]>();
  for (const s of tee) if (s.club) teeByClub.set(s.club, [...(teeByClub.get(s.club) ?? []), s]);
  let bestClub: { club: string; rate: number; n: number } | undefined;
  for (const [club, shots] of teeByClub) {
    if (shots.length < MIN_SAMPLE) continue;
    const rate = shots.filter((s) => s.quality === 'good').length / shots.length;
    if (rate >= DOMINANCE && (!bestClub || rate > bestClub.rate)) bestClub = { club, rate, n: shots.length };
  }
  if (bestClub) {
    out.push({
      ...base,
      kind: 'preferredTeeClub',
      patch: { preferredTeeClub: bestClub.club },
      rationale: `${bestClub.club} off the tee: ${Math.round(bestClub.rate * 100)}% good over ${bestClub.n} shots.`,
      confidence: bestClub.rate,
      sampleSize: bestClub.n,
    });
  }

  // poorClubs — any club (tee or approach) whose outcomes are mostly poor.
  const allByClub = new Map<string, Shot[]>();
  for (const s of hole.shots) if (s.club) allByClub.set(s.club, [...(allByClub.get(s.club) ?? []), s]);
  const poor: string[] = [];
  let poorN = 0;
  let poorFrac = 0;
  for (const [club, shots] of allByClub) {
    if (shots.length < MIN_SAMPLE) continue;
    const rate = shots.filter((s) => s.quality === 'poor').length / shots.length;
    if (rate >= DOMINANCE) ((poor.push(club)), (poorN += shots.length), (poorFrac = Math.max(poorFrac, rate)));
  }
  if (poor.length) {
    out.push({
      ...base,
      kind: 'poorClubs',
      patch: { poorClubs: poor },
      rationale: `Mostly poor contact/result with ${poor.join(', ')} on this hole.`,
      confidence: poorFrac,
      sampleSize: poorN,
    });
  }

  // safeMissZones — dominant tee miss side → the opposite is the safe bail side.
  const sides = tee.map(missSide).filter((s): s is 'left' | 'right' => s !== undefined);
  const dom = dominant(sides);
  if (dom) {
    const safe = dom.value === 'right' ? 'left' : 'right';
    out.push({
      ...base,
      kind: 'safeMissZones',
      patch: { safeMissZones: [safe] },
      rationale: `Tee shots trend ${dom.value} (${Math.round(dom.fraction * 100)}%); ${safe} is the safe miss.`,
      confidence: dom.fraction,
      sampleSize: sides.length,
    });
  }

  // leaveZones — dominant approach distance miss → leave that offsets it.
  const misses = approach.map((s) => s.distance).filter((d) => d !== 'pinHigh');
  const dist = dominant(misses);
  if (dist) {
    const leave = dist.value === 'short' ? 'long' : 'short';
    out.push({
      ...base,
      kind: 'leaveZones',
      patch: { leaveZones: [leave] },
      rationale: `Approaches come up ${dist.value} (${Math.round(dist.fraction * 100)}%); favor the ${leave} leave.`,
      confidence: dist.fraction,
      sampleSize: misses.length,
    });
  }

  return out;
}

/** Scan per-hole history and emit every suggestion above the confidence threshold. */
export function detectLearning(history: readonly HoleHistory[]): SuggestedUpdate[] {
  return history.flatMap(detectHole);
}
