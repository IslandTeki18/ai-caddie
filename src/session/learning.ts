import type { CourseRepository } from '@/data';
import type { CourseIntelligence, CourseIntelligenceMemory, Shot } from '@/core';
import { detectLearning, type HoleHistory, type SuggestedUpdate } from '@/engine';

/**
 * Course-learning session glue (Phase H step 27). Turns a round's stored shots
 * into per-hole suggestions, and persists the ones the player approves into
 * `courseIntelligence`. Rejection is a no-op by construction: only approved
 * suggestions ever reach `applyApprovedUpdate`, so nothing changes strategy
 * automatically (SPEC invariant).
 */

/** Group shots by hole and run the engine. `holeIdByNumber` lets updates persist. */
export function suggestLearning(
  shots: readonly Shot[],
  holeIdByNumber?: Readonly<Record<number, string>>,
): SuggestedUpdate[] {
  const byHole = new Map<number, Shot[]>();
  for (const s of shots) byHole.set(s.holeNumber, [...(byHole.get(s.holeNumber) ?? []), s]);
  const history: HoleHistory[] = [...byHole.entries()].map(([holeNumber, hs]) => ({
    holeNumber,
    holeId: holeIdByNumber?.[holeNumber],
    shots: hs,
  }));
  return detectLearning(history);
}

/** Union arrays (dedup), overwrite scalars. Existing memory wins nothing — the patch does. */
function mergeMemory(
  base: CourseIntelligenceMemory,
  patch: Partial<CourseIntelligenceMemory>,
): CourseIntelligenceMemory {
  const merged: CourseIntelligenceMemory = { ...base };
  for (const [key, value] of Object.entries(patch) as [keyof CourseIntelligenceMemory, unknown][]) {
    if (Array.isArray(value)) {
      const prev = (base[key] as string[] | undefined) ?? [];
      merged[key] = [...new Set([...prev, ...value])] as never;
    } else {
      merged[key] = value as never;
    }
  }
  return merged;
}

/**
 * Persist one approved suggestion, merging its patch into the hole's existing
 * memory (one CourseIntelligence row per hole, id derived from holeId so it is
 * stable and upsert-safe). Throws if the suggestion has no holeId to key on.
 */
export async function applyApprovedUpdate(
  courses: CourseRepository,
  suggestion: SuggestedUpdate,
  now: number,
): Promise<void> {
  if (!suggestion.holeId) throw new Error('cannot persist a suggestion without a holeId');
  const existing = await courses.getCourseIntelligence(suggestion.holeId);
  const intel: CourseIntelligence = {
    id: existing?.id ?? `ci:${suggestion.holeId}`,
    holeId: suggestion.holeId,
    memory: mergeMemory(existing?.memory ?? {}, suggestion.patch),
    updatedAt: now,
  };
  await courses.saveCourseIntelligence(intel);
}
