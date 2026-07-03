import { z } from 'zod';
import { AggressionLevelSchema } from './enums';
import { ShotLogSchema, ShotKindSchema } from './shot';

/**
 * Persisted-entity contracts (SPEC §8 Data Model). These zod schemas are the
 * single shared shape reused by the local Drizzle layer (src/data) and, later,
 * the Convex mirror (Phase E). Every record carries a stable `id` + `updatedAt`
 * (epoch ms) per the sync invariant: last-write-wins by `updatedAt`.
 *
 * Fuzzy / not-yet-pinned nested data (green geometry, learned course memory,
 * weather, dispersion, tendencies) is modeled as zod sub-objects but stored as
 * a single JSON text column rather than normalized tables.
 * ponytail: JSON blobs over normalized tables — reversible, and SPEC still lists
 * green geometry / structured intelligence as open blocking questions. Normalize
 * only once the engine forces a concrete shape.
 */

// --- Shared scalars --------------------------------------------------------

/** Stable record identifier (caller-generated, survives sync). */
export const IdSchema = z.string().min(1);
/** Epoch milliseconds. */
export const UpdatedAtSchema = z.number().int().nonnegative();

// --- Nested JSON sub-shapes (stored as one text column each) ---------------

/** Per-club directional spread, in yards. */
export const DispersionSchema = z.object({
  lateralYards: z.number().nonnegative(),
  longYards: z.number().nonnegative(),
});
export type Dispersion = z.infer<typeof DispersionSchema>;

/** Player-level modifiers. Provisional; tighten as the engine consumes them. */
export const ConfidenceModifiersSchema = z.record(z.string(), z.number());
export type ConfidenceModifiers = z.infer<typeof ConfidenceModifiersSchema>;

export const MissTendenciesSchema = z.record(z.string(), z.string());
export type MissTendencies = z.infer<typeof MissTendenciesSchema>;

/** Structured hole/green geometry — shape deliberately loose for now. */
export const HoleGeometrySchema = z
  .object({
    notes: z.string().optional(),
    /** Scorecard yardage for the hole (from course import). */
    yardage: z.number().optional(),
    /** Stroke index / handicap 1–18 (from course import). */
    handicap: z.number().optional(),
  })
  .passthrough();
export type HoleGeometry = z.infer<typeof HoleGeometrySchema>;

/** Learned per-hole memory (SPEC §8 CourseIntelligence). */
export const CourseIntelligenceMemorySchema = z
  .object({
    preferredTeeClub: z.string().optional(),
    targetLine: z.string().optional(),
    safeMissZones: z.array(z.string()).optional(),
    greenIntel: z.string().optional(),
    leaveZones: z.array(z.string()).optional(),
    poorClubs: z.array(z.string()).optional(),
    conditionNotes: z.string().optional(),
  })
  .passthrough();
export type CourseIntelligenceMemory = z.infer<typeof CourseIntelligenceMemorySchema>;

/** Round weather snapshot. */
export const WeatherSchema = z.object({
  windMph: z.number().optional(),
  tempF: z.number().optional(),
});
export type Weather = z.infer<typeof WeatherSchema>;

// --- Entity records (SPEC §8) ----------------------------------------------

export const PlayerProfileSchema = z.object({
  id: IdSchema,
  name: z.string().optional(),
  confidenceModifiers: ConfidenceModifiersSchema,
  missTendencies: MissTendenciesSchema,
  updatedAt: UpdatedAtSchema,
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const ClubBaselineSchema = z.object({
  id: IdSchema,
  club: z.string().min(1),
  distanceYards: z.number().nonnegative(),
  dispersion: DispersionSchema,
  /** Free-form per-club tendency note (e.g. "pull-prone under pressure"). */
  tendency: z.string(),
  updatedAt: UpdatedAtSchema,
});
export type ClubBaseline = z.infer<typeof ClubBaselineSchema>;

export const CourseSchema = z.object({
  id: IdSchema,
  name: z.string(),
  updatedAt: UpdatedAtSchema,
});
export type Course = z.infer<typeof CourseSchema>;

export const HoleSchema = z.object({
  id: IdSchema,
  courseId: IdSchema,
  number: z.number().int().positive(),
  par: z.number().int().positive(),
  geometry: HoleGeometrySchema,
  updatedAt: UpdatedAtSchema,
});
export type Hole = z.infer<typeof HoleSchema>;

export const CourseIntelligenceSchema = z.object({
  id: IdSchema,
  holeId: IdSchema,
  memory: CourseIntelligenceMemorySchema,
  updatedAt: UpdatedAtSchema,
});
export type CourseIntelligence = z.infer<typeof CourseIntelligenceSchema>;

export const RoundSchema = z.object({
  id: IdSchema,
  courseId: IdSchema.optional(),
  weather: WeatherSchema,
  aggressionDefault: AggressionLevelSchema,
  startedAt: UpdatedAtSchema,
  /** Set when the round finishes; absent ⇒ in progress (drives crash-safe resume). */
  completedAt: UpdatedAtSchema.optional(),
  /** Live hole pointer, persisted so a manually-selected hole survives a crash. */
  currentHole: z.number().int().positive().optional(),
  updatedAt: UpdatedAtSchema,
});
export type Round = z.infer<typeof RoundSchema>;

/** A logged shot belonging to a round (SPEC §8 Shot = ShotLog + kind + keys). */
export const ShotSchema = ShotLogSchema.extend({
  id: IdSchema,
  roundId: IdSchema,
  holeNumber: z.number().int().positive(),
  kind: ShotKindSchema,
  /** Club hit, when known — feeds per-hole course learning (SPEC §"Course learning"). */
  club: z.string().optional(),
  updatedAt: UpdatedAtSchema,
});
export type Shot = z.infer<typeof ShotSchema>;
