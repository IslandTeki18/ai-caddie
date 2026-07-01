import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Sync endpoints (Phase E, blueprint step 17). One generic envelope instead of
 * 7× near-identical fns: every record is `{ table, doc }`, resolved last-write-
 * wins by `updatedAt`. Keyed by the stable client `id`, never Convex's `_id`.
 */

const TABLES = [
  'playerProfile',
  'clubBaseline',
  'course',
  'hole',
  'courseIntelligence',
  'round',
  'shot',
] as const;

const syncTable = v.union(...TABLES.map((t) => v.literal(t)));
const syncRecord = v.object({ table: syncTable, doc: v.any() });

/**
 * Upsert a client batch. Insert when the client `id` is unseen; otherwise patch
 * only when the incoming row is at least as new as the stored one (LWW).
 */
export const upsertFromClient = mutation({
  args: { records: v.array(syncRecord) },
  handler: async (ctx, { records }) => {
    for (const { table, doc } of records) {
      const existing = await ctx.db
        .query(table)
        .withIndex('by_client_id', (q) => q.eq('id', doc.id))
        .unique();
      if (!existing) {
        await ctx.db.insert(table, doc);
      } else if (doc.updatedAt >= existing.updatedAt) {
        await ctx.db.patch(existing._id, doc);
      }
    }
  },
});

/**
 * Pull every record newer than `since` across all tables, stripped of Convex
 * system fields so it round-trips straight back into the local store.
 */
export const pullSince = query({
  args: { since: v.number() },
  handler: async (ctx, { since }) => {
    const out: { table: (typeof TABLES)[number]; doc: Record<string, unknown> }[] = [];
    for (const table of TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_updated', (q) => q.gt('updatedAt', since))
        .collect();
      for (const row of rows) {
        const { _id, _creationTime, ...doc } = row;
        out.push({ table, doc });
      }
    }
    return out;
  },
});
