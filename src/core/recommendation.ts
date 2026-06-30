import { z } from 'zod';

/**
 * The single object the UI consumes per shot. Six fields, never a menu
 * (project invariant P0-1). `shape` is free text so descriptive shapes like
 * "soft fade" from the spec example render verbatim; the constrained
 * ShotShape enum is for engine-internal use.
 */
export const RecommendationSchema = z.object({
  club: z.string(),
  target: z.string(),
  shape: z.string(),
  bestMiss: z.string(),
  doNot: z.string(),
  cue: z.string(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;
