import { eq, asc } from 'drizzle-orm';
import type { ZodType } from 'zod';
import {
  PlayerProfileSchema,
  ClubBaselineSchema,
  CourseSchema,
  HoleSchema,
  CourseIntelligenceSchema,
  RoundSchema,
  ShotSchema,
  type PlayerProfile,
  type ClubBaseline,
  type Course,
  type Hole,
  type CourseIntelligence,
  type Round,
  type Shot,
} from '@/core';
import type { CaddieDb } from './db';
import {
  playerProfile,
  clubBaseline,
  course,
  hole,
  courseIntelligence,
  round,
  shot,
} from './schema';
import type { PlayerRepository, CourseRepository, RoundRepository } from './repositories';

/**
 * Local Drizzle-backed repositories. Drizzle handles JSON (de)serialization for
 * the `text({ mode: 'json' })` columns; the row→core boundary re-validates with
 * the core zod schema so a corrupt or schema-drifted blob fails loudly here
 * instead of leaking a malformed object into the engine.
 *
 * Single-player app ⇒ one PlayerProfile; getProfile returns the first row.
 */

const SINGLE = 1;

/**
 * Row → core boundary. SQLite stores absent optional columns (e.g. nullable FKs)
 * as NULL, but the core zod schemas use `.optional()` (undefined). Coalesce
 * NULL→undefined shallowly, then validate so a corrupt/drifted blob fails loudly.
 */
function fromRow<T>(schema: ZodType<T>, row: Record<string, unknown>): T {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) clean[k] = v === null ? undefined : v;
  return schema.parse(clean);
}

export class LocalPlayerRepository implements PlayerRepository {
  constructor(private readonly db: CaddieDb) {}

  async getProfile(): Promise<PlayerProfile | undefined> {
    const rows = await this.db.select().from(playerProfile).limit(SINGLE);
    return rows[0] ? fromRow(PlayerProfileSchema, rows[0]) : undefined;
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    const row = PlayerProfileSchema.parse(profile);
    await this.db
      .insert(playerProfile)
      .values(row)
      .onConflictDoUpdate({ target: playerProfile.id, set: row });
  }

  async listClubBaselines(): Promise<ClubBaseline[]> {
    const rows = await this.db.select().from(clubBaseline).orderBy(asc(clubBaseline.club));
    return rows.map((r) => fromRow(ClubBaselineSchema, r));
  }

  async upsertClubBaselines(baselines: ClubBaseline[]): Promise<void> {
    for (const baseline of baselines) {
      const row = ClubBaselineSchema.parse(baseline);
      // Idempotent on `club`: reuse the existing row's id so re-import updates
      // in place instead of inserting a duplicate.
      const existing = await this.db
        .select({ id: clubBaseline.id })
        .from(clubBaseline)
        .where(eq(clubBaseline.club, row.club))
        .limit(SINGLE);
      const id = existing[0]?.id ?? row.id;
      await this.db
        .insert(clubBaseline)
        .values({ ...row, id })
        .onConflictDoUpdate({ target: clubBaseline.id, set: { ...row, id } });
    }
  }
}

export class LocalCourseRepository implements CourseRepository {
  constructor(private readonly db: CaddieDb) {}

  async getCourse(id: string): Promise<Course | undefined> {
    const rows = await this.db.select().from(course).where(eq(course.id, id)).limit(SINGLE);
    return rows[0] ? fromRow(CourseSchema, rows[0]) : undefined;
  }

  async saveCourse(value: Course): Promise<void> {
    const row = CourseSchema.parse(value);
    await this.db.insert(course).values(row).onConflictDoUpdate({ target: course.id, set: row });
  }

  async listHoles(courseId: string): Promise<Hole[]> {
    const rows = await this.db
      .select()
      .from(hole)
      .where(eq(hole.courseId, courseId))
      .orderBy(asc(hole.number));
    return rows.map((r) => fromRow(HoleSchema, r));
  }

  async getCourseIntelligence(holeId: string): Promise<CourseIntelligence | undefined> {
    const rows = await this.db
      .select()
      .from(courseIntelligence)
      .where(eq(courseIntelligence.holeId, holeId))
      .limit(SINGLE);
    return rows[0] ? fromRow(CourseIntelligenceSchema, rows[0]) : undefined;
  }

  async saveCourseIntelligence(value: CourseIntelligence): Promise<void> {
    const row = CourseIntelligenceSchema.parse(value);
    await this.db
      .insert(courseIntelligence)
      .values(row)
      .onConflictDoUpdate({ target: courseIntelligence.id, set: row });
  }
}

export class LocalRoundRepository implements RoundRepository {
  constructor(private readonly db: CaddieDb) {}

  async createRound(value: Round): Promise<void> {
    const row = RoundSchema.parse(value);
    await this.db.insert(round).values(row).onConflictDoUpdate({ target: round.id, set: row });
  }

  async getRound(id: string): Promise<Round | undefined> {
    const rows = await this.db.select().from(round).where(eq(round.id, id)).limit(SINGLE);
    return rows[0] ? fromRow(RoundSchema, rows[0]) : undefined;
  }

  async addShot(value: Shot): Promise<void> {
    const row = ShotSchema.parse(value);
    await this.db.insert(shot).values(row).onConflictDoUpdate({ target: shot.id, set: row });
  }

  async listShots(roundId: string): Promise<Shot[]> {
    const rows = await this.db
      .select()
      .from(shot)
      .where(eq(shot.roundId, roundId))
      .orderBy(asc(shot.timestamp));
    return rows.map((r) => fromRow(ShotSchema, r));
  }
}
