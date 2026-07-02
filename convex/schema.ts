import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Convex mirror of the core entity types (Phase E, blueprint step 17). This is
 * the additive cloud backup — local SQLite (src/data) stays the source of truth.
 *
 * Each table stores the stable client `id` as a normal field (Convex generates
 * its own `_id`) plus `updatedAt` for last-write-wins. Two indexes per table:
 *   - by_client_id — upsert lookup keyed by the client id
 *   - by_updated   — pullSince scan by watermark
 *
 * ponytail: loose nested sub-shapes (dispersion, weather, geometry, memory,
 * modifiers, tendencies) are `v.any()`. The core zod (passthrough()/record)
 * already owns those shapes and the local layer re-validates on read, so
 * hand-mirroring rigid Convex validators would be duplicate contract, no payoff.
 */

const withKeys = { id: v.string(), updatedAt: v.number() };
const idx = (t: ReturnType<typeof defineTable>) =>
  t.index('by_client_id', ['id']).index('by_updated', ['updatedAt']);

export default defineSchema({
  playerProfile: idx(
    defineTable({
      ...withKeys,
      name: v.optional(v.string()),
      confidenceModifiers: v.any(),
      missTendencies: v.any(),
    }),
  ),
  clubBaseline: idx(
    defineTable({
      ...withKeys,
      club: v.string(),
      distanceYards: v.number(),
      dispersion: v.any(),
      tendency: v.string(),
    }),
  ),
  course: idx(
    defineTable({
      ...withKeys,
      name: v.string(),
    }),
  ),
  hole: idx(
    defineTable({
      ...withKeys,
      courseId: v.string(),
      number: v.number(),
      par: v.number(),
      geometry: v.any(),
    }),
  ),
  courseIntelligence: idx(
    defineTable({
      ...withKeys,
      holeId: v.string(),
      memory: v.any(),
    }),
  ),
  round: idx(
    defineTable({
      ...withKeys,
      courseId: v.optional(v.string()),
      weather: v.any(),
      aggressionDefault: v.string(),
      startedAt: v.number(),
    }),
  ),
  shot: idx(
    defineTable({
      ...withKeys,
      roundId: v.string(),
      holeNumber: v.number(),
      kind: v.string(),
      club: v.optional(v.string()),
      startDirection: v.string(),
      curve: v.string(),
      contact: v.string(),
      distance: v.string(),
      quality: v.string(),
      timestamp: v.number(),
    }),
  ),
});
