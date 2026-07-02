import { describe, it, expect } from 'vitest';
import type { Shot } from '@/core';
import { detectLearning, type HoleHistory, type SuggestedUpdate } from './learning';

/** Minimal Shot factory; overrides pin down whatever a case cares about. */
function mk(over: Partial<Shot>): Shot {
  return {
    id: 'x',
    roundId: 'r',
    holeNumber: 1,
    kind: 'tee',
    startDirection: 'onLine',
    curve: 'straight',
    contact: 'center',
    distance: 'pinHigh',
    quality: 'neutral',
    timestamp: 0,
    updatedAt: 0,
    ...over,
  };
}

function of(shots: Shot[], holeId = 'h1'): HoleHistory[] {
  return [{ holeNumber: 1, holeId, shots }];
}

const pick = (u: SuggestedUpdate[], kind: SuggestedUpdate['kind']) => u.find((s) => s.kind === kind);

describe('detectLearning', () => {
  it('stays silent below the sample threshold', () => {
    const shots = [mk({ kind: 'tee', club: '3W', quality: 'good' }), mk({ kind: 'tee', club: '3W', quality: 'good' })];
    expect(detectLearning(of(shots))).toEqual([]);
  });

  it('suggests a preferred tee club when a club is reliably good', () => {
    const shots = Array.from({ length: 4 }, () => mk({ kind: 'tee', club: '3W', quality: 'good' }));
    const u = pick(detectLearning(of(shots)), 'preferredTeeClub');
    expect(u?.patch.preferredTeeClub).toBe('3W');
    expect(u?.holeId).toBe('h1');
    expect(u?.confidence).toBe(1);
  });

  it('flags a poorly performing club', () => {
    const shots = [
      mk({ kind: 'tee', club: 'Driver', quality: 'poor' }),
      mk({ kind: 'tee', club: 'Driver', quality: 'poor' }),
      mk({ kind: 'tee', club: 'Driver', quality: 'good' }),
    ];
    const u = pick(detectLearning(of(shots)), 'poorClubs');
    expect(u?.patch.poorClubs).toEqual(['Driver']);
  });

  it('infers the safe miss from a dominant tee miss side', () => {
    // Ball trends right → left is the safe bail side.
    const shots = [
      mk({ kind: 'tee', curve: 'slice' }),
      mk({ kind: 'tee', startDirection: 'right' }),
      mk({ kind: 'tee', curve: 'fade' }),
    ];
    const u = pick(detectLearning(of(shots)), 'safeMissZones');
    expect(u?.patch.safeMissZones).toEqual(['left']);
  });

  it('suggests a leave that offsets a dominant distance miss', () => {
    // Approaches come up short → favor the long leave.
    const shots = Array.from({ length: 3 }, () =>
      mk({ kind: 'approach', distance: 'short', quality: 'neutral' }),
    );
    const u = pick(detectLearning(of(shots)), 'leaveZones');
    expect(u?.patch.leaveZones).toEqual(['long']);
  });

  it('does not fire when no side/distance clears dominance', () => {
    const shots = [
      mk({ kind: 'tee', curve: 'slice' }),
      mk({ kind: 'tee', curve: 'hook' }),
      mk({ kind: 'tee', startDirection: 'onLine' }),
    ];
    expect(pick(detectLearning(of(shots)), 'safeMissZones')).toBeUndefined();
  });
});
