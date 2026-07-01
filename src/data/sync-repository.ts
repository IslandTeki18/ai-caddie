import { gt, eq } from 'drizzle-orm';
import type { ZodType } from 'zod';
import {
  PlayerProfileSchema,
  ClubBaselineSchema,
  CourseSchema,
  HoleSchema,
  CourseIntelligenceSchema,
  RoundSchema,
  ShotSchema,
  SYNC_TABLES,
  type SyncRecord,
  type SyncTable,
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

/**
 * Generic sync seam over the local store (Phase E, blueprint step 18). Sync only
 * ever touches SQLite through this — it never opens the DB directly — so the
 * "sync writes local only through the data layer" invariant stays honest.
 *
 * ponytail: one dynamic table map + `any` on the drizzle handle instead of a
 * 7-case switch. Type safety at the boundary is restored by re-validating every
 * row through the core zod schema (fromRow), so drifted data still fails loud.
 */

interface TableEntry {
  // drizzle table objects don't share a usable common type across columns.
  table: any;
  schema: ZodType<unknown>;
}

const TABLE_MAP: Record<SyncTable, TableEntry> = {
  playerProfile: { table: playerProfile, schema: PlayerProfileSchema },
  clubBaseline: { table: clubBaseline, schema: ClubBaselineSchema },
  course: { table: course, schema: CourseSchema },
  hole: { table: hole, schema: HoleSchema },
  courseIntelligence: { table: courseIntelligence, schema: CourseIntelligenceSchema },
  round: { table: round, schema: RoundSchema },
  shot: { table: shot, schema: ShotSchema },
};

/** Row → core boundary: NULL → undefined (nullable FKs), then zod-validate. */
function fromRow(schema: ZodType<unknown>, row: Record<string, unknown>): unknown {
  const clean: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(row)) clean[k] = val === null ? undefined : val;
  return schema.parse(clean);
}

export class SyncRepository {
  constructor(private readonly db: CaddieDb) {}

  /** All local rows strictly newer than `since`, tagged with their table. */
  async collectSince(since: number): Promise<SyncRecord[]> {
    const out: SyncRecord[] = [];
    for (const name of SYNC_TABLES) {
      const { table, schema } = TABLE_MAP[name];
      const rows = await this.db.select().from(table).where(gt(table.updatedAt, since));
      for (const row of rows) {
        out.push({ table: name, doc: fromRow(schema, row) } as SyncRecord);
      }
    }
    return out;
  }

  /** Upsert remote rows, keeping whichever `updatedAt` is newer (LWW). */
  async applyRemote(records: SyncRecord[]): Promise<void> {
    for (const { table: name, doc } of records) {
      const { table, schema } = TABLE_MAP[name];
      const incoming = schema.parse(doc) as { id: string; updatedAt: number };
      const existing = await this.db
        .select({ updatedAt: table.updatedAt })
        .from(table)
        .where(eq(table.id, incoming.id))
        .limit(1);
      // Local strictly newer wins; equal or older incoming is applied.
      if (existing[0] && existing[0].updatedAt > incoming.updatedAt) continue;
      await this.db
        .insert(table)
        .values(incoming)
        .onConflictDoUpdate({ target: table.id, set: incoming });
    }
  }
}
