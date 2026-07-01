import type {
  PlayerProfile,
  ClubBaseline,
  Course,
  Hole,
  CourseIntelligence,
  Round,
  Shot,
} from './entities';

/**
 * Sync envelope shapes (Phase E). A `SyncRecord` is a single entity tagged with
 * its table so the reconciliation layer can push/pull a heterogeneous batch
 * through one channel (LWW by `updatedAt`). Lives in `core` — the lowest layer —
 * so both `src/data` (producer) and `src/sync` (consumer) share one contract
 * without violating the import direction.
 */

export const SYNC_TABLES = [
  'playerProfile',
  'clubBaseline',
  'course',
  'hole',
  'courseIntelligence',
  'round',
  'shot',
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

export type SyncRecord =
  | { table: 'playerProfile'; doc: PlayerProfile }
  | { table: 'clubBaseline'; doc: ClubBaseline }
  | { table: 'course'; doc: Course }
  | { table: 'hole'; doc: Hole }
  | { table: 'courseIntelligence'; doc: CourseIntelligence }
  | { table: 'round'; doc: Round }
  | { table: 'shot'; doc: Shot };
