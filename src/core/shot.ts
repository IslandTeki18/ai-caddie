import { z } from 'zod';
import {
  StartDirectionSchema,
  CurveSchema,
  ContactSchema,
  DistanceResultSchema,
  QualitySchema,
} from './enums';

export const ShotKindSchema = z.enum(['tee', 'approach']);
export type ShotKind = z.infer<typeof ShotKindSchema>;

/** A logged tee or approach result. `timestamp` is epoch milliseconds. */
export const ShotLogSchema = z.object({
  startDirection: StartDirectionSchema,
  curve: CurveSchema,
  contact: ContactSchema,
  distance: DistanceResultSchema,
  quality: QualitySchema,
  timestamp: z.number().int().nonnegative(),
});
export type ShotLog = z.infer<typeof ShotLogSchema>;
