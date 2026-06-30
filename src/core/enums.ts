import { z } from 'zod';

/**
 * Core domain vocabulary. Zod schemas are the single source of truth — every TS
 * type is inferred from its schema so the local Drizzle layer and the Convex
 * schema can reuse the exact same contract (per project invariant).
 *
 * SPEC pins exact members for the logging enums + Elevation. Lie / PinLocation /
 * Confidence / AggressionLevel / ShotShape are left open in SPEC §"Open
 * questions"; the members below are provisional V1 vocabulary.
 * ponytail: provisional values, tighten once SPEC open questions resolve.
 */

// --- Units / shot-input vocabulary -----------------------------------------

/** Non-negative distance in yards. */
export const YardageSchema = z.number().nonnegative();
export type Yardage = z.infer<typeof YardageSchema>;

export const ElevationSchema = z.enum(['up', 'flat', 'down']);
export type Elevation = z.infer<typeof ElevationSchema>;

export const LieSchema = z.enum(['tee', 'fairway', 'rough', 'sand']);
export type Lie = z.infer<typeof LieSchema>;

export const PinLocationSchema = z.enum(['front', 'middle', 'back', 'left', 'right']);
export type PinLocation = z.infer<typeof PinLocationSchema>;

export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const AggressionLevelSchema = z.enum(['conservative', 'neutral', 'aggressive']);
export type AggressionLevel = z.infer<typeof AggressionLevelSchema>;

export const ShotShapeSchema = z.enum(['draw', 'straight', 'fade']);
export type ShotShape = z.infer<typeof ShotShapeSchema>;

// --- Logging vocabulary (exact per SPEC P0-6) ------------------------------

export const StartDirectionSchema = z.enum(['left', 'onLine', 'right']);
export type StartDirection = z.infer<typeof StartDirectionSchema>;

export const CurveSchema = z.enum(['hook', 'straight', 'fade', 'slice']);
export type Curve = z.infer<typeof CurveSchema>;

export const ContactSchema = z.enum(['thin', 'fat', 'center', 'toe', 'heel']);
export type Contact = z.infer<typeof ContactSchema>;

export const DistanceResultSchema = z.enum(['short', 'pinHigh', 'long']);
export type DistanceResult = z.infer<typeof DistanceResultSchema>;

export const QualitySchema = z.enum(['good', 'neutral', 'poor']);
export type Quality = z.infer<typeof QualitySchema>;
