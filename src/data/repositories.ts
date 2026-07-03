import type {
  PlayerProfile,
  ClubBaseline,
  Course,
  Hole,
  CourseIntelligence,
  Round,
  Shot,
} from '@/core';

/**
 * Repository interfaces — the swap seam. They accept and return `src/core`
 * types only, never raw Drizzle rows, so callers (session, sync, UI) never see
 * the persistence layer. Local Drizzle implementations live in
 * `./local-repositories`; an in-memory or remote impl could replace them
 * without touching any consumer.
 */

export interface PlayerRepository {
  getProfile(): Promise<PlayerProfile | undefined>;
  saveProfile(profile: PlayerProfile): Promise<void>;
  listClubBaselines(): Promise<ClubBaseline[]>;
  /** Idempotent upsert keyed by `club` (preserves an existing row's id). */
  upsertClubBaselines(baselines: ClubBaseline[]): Promise<void>;
}

export interface CourseRepository {
  getCourse(id: string): Promise<Course | undefined>;
  saveCourse(course: Course): Promise<void>;
  listHoles(courseId: string): Promise<Hole[]>;
  getCourseIntelligence(holeId: string): Promise<CourseIntelligence | undefined>;
  saveCourseIntelligence(intel: CourseIntelligence): Promise<void>;
}

export interface RoundRepository {
  createRound(round: Round): Promise<void>;
  getRound(id: string): Promise<Round | undefined>;
  /** All stored rounds, newest first — for cross-round analytics/trends. */
  listRounds(): Promise<Round[]>;
  /** Marks the round finished (sets completedAt + updatedAt for LWW sync). */
  completeRound(id: string, completedAt: number): Promise<void>;
  /** Newest round with no completedAt — the crash-safe resume candidate. */
  findInProgressRound(): Promise<Round | undefined>;
  addShot(shot: Shot): Promise<void>;
  listShots(roundId: string): Promise<Shot[]>;
}
