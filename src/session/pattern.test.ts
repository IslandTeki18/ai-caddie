import { describe, it, expect } from 'vitest';
import type { Shot } from '@/core';
import { recentStartPattern } from './recommendation';

const shot = (startDirection: Shot['startDirection']): Shot => ({
  id: 'x', roundId: 'r', holeNumber: 1, kind: 'approach', updatedAt: 0, timestamp: 0,
  startDirection, curve: 'straight', contact: 'center', distance: 'pinHigh', quality: 'neutral',
});

describe('recentStartPattern', () => {
  it('reports the dominant side over the last four', () => {
    const shots = [shot('left'), shot('right'), shot('right'), shot('onLine'), shot('right')];
    expect(recentStartPattern(shots)).toEqual({ direction: 'right', count: 3, total: 4 });
  });
  it('is silent below the sample threshold or when on-line dominates', () => {
    expect(recentStartPattern([shot('right'), shot('right')])).toBeUndefined();
    expect(recentStartPattern([shot('onLine'), shot('onLine'), shot('onLine'), shot('right')])).toBeUndefined();
  });
});
