import { z } from 'zod';
import type { ClubBaseline } from '@/core';
import type { PlayerRepository } from './repositories';

/**
 * TrackMan baseline importer.
 *
 * ponytail: this targets a provisional internal JSON shape, not a raw TrackMan
 * export. The real export format (CSV / PDF / screenshots — SPEC §12 open
 * blocking question) is unknown; once it lands, a thin adapter normalizes it
 * into `TrackManImport` and this importer stays unchanged.
 *
 * Idempotent: keyed by `club` via the repository's upsert, so re-importing the
 * same file updates rows in place rather than duplicating them. Ids are derived
 * deterministically from the club name so a fresh import is stable across runs.
 */

const TrackManClubSchema = z.object({
  club: z.string().min(1),
  distanceYards: z.number().nonnegative(),
  dispersion: z.object({
    lateralYards: z.number().nonnegative(),
    longYards: z.number().nonnegative(),
  }),
  tendency: z.string(),
});

export const TrackManImportSchema = z.object({
  clubs: z.array(TrackManClubSchema),
});
export type TrackManImport = z.infer<typeof TrackManImportSchema>;

/** Deterministic, stable id from club name (idempotency-friendly). */
function clubId(club: string): string {
  return `club:${club.trim().toLowerCase()}`;
}

export async function importTrackManBaselines(
  players: PlayerRepository,
  raw: unknown,
  now: number,
): Promise<ClubBaseline[]> {
  const parsed = TrackManImportSchema.parse(raw);
  const baselines: ClubBaseline[] = parsed.clubs.map((c) => ({
    id: clubId(c.club),
    club: c.club,
    distanceYards: c.distanceYards,
    dispersion: c.dispersion,
    tendency: c.tendency,
    updatedAt: now,
  }));
  await players.upsertClubBaselines(baselines);
  return baselines;
}
