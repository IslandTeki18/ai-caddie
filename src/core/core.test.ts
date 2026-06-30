import { describe, it, expect } from 'vitest';
import {
  ElevationSchema,
  LieSchema,
  PinLocationSchema,
  ConfidenceSchema,
  AggressionLevelSchema,
  ShotShapeSchema,
  StartDirectionSchema,
  CurveSchema,
  ContactSchema,
  DistanceResultSchema,
  QualitySchema,
  YardageSchema,
  RecommendationSchema,
  ShotLogSchema,
  ShotKindSchema,
} from './index';

const enumCases: Array<[string, { parse: (v: unknown) => unknown }, readonly string[]]> = [
  ['Elevation', ElevationSchema, ['up', 'flat', 'down']],
  ['Lie', LieSchema, ['tee', 'fairway', 'rough', 'sand']],
  ['PinLocation', PinLocationSchema, ['front', 'middle', 'back', 'left', 'right']],
  ['Confidence', ConfidenceSchema, ['low', 'medium', 'high']],
  ['AggressionLevel', AggressionLevelSchema, ['conservative', 'neutral', 'aggressive']],
  ['ShotShape', ShotShapeSchema, ['draw', 'straight', 'fade']],
  ['StartDirection', StartDirectionSchema, ['left', 'onLine', 'right']],
  ['Curve', CurveSchema, ['hook', 'straight', 'fade', 'slice']],
  ['Contact', ContactSchema, ['thin', 'fat', 'center', 'toe', 'heel']],
  ['DistanceResult', DistanceResultSchema, ['short', 'pinHigh', 'long']],
  ['Quality', QualitySchema, ['good', 'neutral', 'poor']],
  ['ShotKind', ShotKindSchema, ['tee', 'approach']],
];

describe('enum schemas', () => {
  for (const [name, schema, members] of enumCases) {
    it(`${name}: accepts every member and round-trips`, () => {
      for (const m of members) {
        expect(schema.parse(m)).toBe(m);
      }
    });
    it(`${name}: rejects an invalid value`, () => {
      expect(() => schema.parse('__nope__')).toThrow();
    });
  }
});

describe('Yardage', () => {
  it('accepts non-negative numbers', () => {
    expect(YardageSchema.parse(0)).toBe(0);
    expect(YardageSchema.parse(159)).toBe(159);
  });
  it('rejects negatives', () => {
    expect(() => YardageSchema.parse(-1)).toThrow();
  });
});

describe('Recommendation', () => {
  const rec = {
    club: '7i',
    target: 'functional center-left',
    shape: 'soft fade',
    bestMiss: 'short-right',
    doNot: 'long-left',
    cue: 'commit to the picture',
  };
  it('constructs and validates the six-field shape', () => {
    expect(RecommendationSchema.parse(rec)).toEqual(rec);
  });
  it('rejects a missing field', () => {
    const { cue, ...partial } = rec;
    void cue;
    expect(() => RecommendationSchema.parse(partial)).toThrow();
  });
});

describe('ShotLog', () => {
  const log = {
    startDirection: 'onLine',
    curve: 'fade',
    contact: 'center',
    distance: 'pinHigh',
    quality: 'good',
    timestamp: 1_700_000_000_000,
  };
  it('constructs and validates', () => {
    expect(ShotLogSchema.parse(log)).toEqual(log);
  });
  it('rejects an invalid enum member', () => {
    expect(() => ShotLogSchema.parse({ ...log, contact: 'shank' })).toThrow();
  });
});
