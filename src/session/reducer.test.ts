import { describe, it, expect } from 'vitest';
import type { Round, Shot, ClubBaseline } from '@/core';
import { reducer, createSetupState } from './reducer';
import { currentRecommendation, currentDispersion } from './recommendation';
import type { Action } from './actions';
import type { SessionState, TeeShotInput, ApproachShotInput } from './state';

const round: Round = {
  id: 'r1',
  weather: {},
  aggressionDefault: 'neutral',
  startedAt: 0,
  updatedAt: 0,
};

const driverBaseline: ClubBaseline = {
  id: 'b-driver',
  club: 'Driver',
  distanceYards: 270,
  dispersion: { lateralYards: 15, longYards: 10 },
  tendency: 'stock fade',
  updatedAt: 0,
};

function shot(partial: Partial<Shot> & Pick<Shot, 'id' | 'holeNumber' | 'kind'>): Shot {
  return {
    roundId: 'r1',
    startDirection: 'onLine',
    curve: 'straight',
    contact: 'center',
    distance: 'pinHigh',
    quality: 'neutral',
    timestamp: 0,
    updatedAt: 0,
    ...partial,
  };
}

const teeInput: TeeShotInput = { kind: 'tee', club: 'Driver', confidence: 'medium' };
const approachInput: ApproachShotInput = {
  kind: 'approach',
  club: '7i',
  confidence: 'medium',
  yardage: 165,
  lie: 'fairway',
  elevation: 'flat',
  pin: 'middle',
  green: {},
};

describe('round reducer — 18-hole loop (step 14)', () => {
  it('drives setup → 18 holes → roundComplete with 36 logged shots', () => {
    let state = createSetupState(round, [driverBaseline]);
    expect(state.phase).toBe('setup');

    let shotId = 0;
    for (let n = 1; n <= 18; n++) {
      state = reducer(state, { type: 'START_HOLE', holeNumber: n });
      expect(state.phase).toBe('teeShot');
      expect(state.holeNumber).toBe(n);

      state = reducer(state, { type: 'SET_SHOT_CONTEXT', input: teeInput });
      expect(state.currentShot).toEqual(teeInput);

      state = reducer(state, { type: 'LOG_SHOT', shot: shot({ id: `s${shotId++}`, holeNumber: n, kind: 'tee' }) });
      expect(state.phase).toBe('approach');
      expect(state.currentShot).toBeUndefined();

      state = reducer(state, { type: 'SET_SHOT_CONTEXT', input: approachInput });
      state = reducer(state, { type: 'LOG_SHOT', shot: shot({ id: `s${shotId++}`, holeNumber: n, kind: 'approach' }) });
      expect(state.phase).toBe('approach');

      state = reducer(state, { type: 'COMPLETE_HOLE' });
      expect(state.phase).toBe('holeComplete');

      state = reducer(state, { type: 'NEXT_HOLE' });
    }

    expect(state.phase).toBe('roundComplete');
    expect(state.shots).toHaveLength(36);
  });

  it('NEXT_HOLE before the last hole returns to teeShot on the next hole', () => {
    let state: SessionState = { ...createSetupState(round, [driverBaseline]), phase: 'holeComplete', holeNumber: 5 };
    state = reducer(state, { type: 'NEXT_HOLE' });
    expect(state.phase).toBe('teeShot');
    expect(state.holeNumber).toBe(6);
  });

  it('ignores out-of-phase actions (total reducer)', () => {
    const state = createSetupState(round, [driverBaseline]); // phase 'setup'
    const action: Action = { type: 'LOG_SHOT', shot: shot({ id: 'x', holeNumber: 1, kind: 'tee' }) };
    expect(reducer(state, action)).toEqual(state);
  });
});

describe('current-round adaptation within the moderate cap (step 15)', () => {
  // Right hazard sits 5 yds outside the baseline right edge (bias 0 + lateral 15 = 15).
  const hazardTee: TeeShotInput = {
    kind: 'tee',
    club: 'Driver',
    confidence: 'medium',
    hazards: [{ side: 'right', type: 'water', lateralYards: 20 }],
  };

  // center contact + pinHigh keep widthDelta at 0, isolating the bias cap.
  const sliceShot = (id: string): Shot =>
    shot({ id, holeNumber: 1, kind: 'tee', startDirection: 'right', curve: 'slice' });

  function withTee(shots: Shot[]): SessionState {
    return { ...createSetupState(round, [driverBaseline]), phase: 'teeShot', shots, currentShot: hazardTee };
  }

  it('keeps Driver with no logs', () => {
    expect(currentRecommendation(withTee([]))?.club).toBe('Driver');
  });

  it('one bad shift is capped (≤2 yds bias) and does not clear the hazard', () => {
    const state = withTee([sliceShot('s0')]);
    expect(currentDispersion(state).biasYards).toBeLessThanOrEqual(2);
    expect(currentDispersion(state).biasYards).toBe(2); // right+slice clamps to the 2-yd cap
    expect(currentRecommendation(state)?.club).toBe('Driver'); // edge 15+2=17 < hazard 20
  });

  it('consistent shots accumulate (bounded) and flip the club to 3-wood', () => {
    const one = currentDispersion(withTee([sliceShot('a')])).biasYards;
    const three = currentDispersion(withTee([sliceShot('a'), sliceShot('b'), sliceShot('c')])).biasYards;
    expect(three).toBeGreaterThan(one); // monotonic
    expect(three).toBeLessThanOrEqual(2 * 3); // bounded by per-shot cap × n
    // edge 15 + 6 = 21 > hazard 20 → downgrade
    expect(currentRecommendation(withTee([sliceShot('a'), sliceShot('b'), sliceShot('c')]))?.club).toBe('3-wood');
  });

  it('the mental cue tracks the live right miss', () => {
    const cue = currentRecommendation(withTee([sliceShot('s0')]))?.cue;
    expect(cue).toBe('hold it through the right edge'); // MissPattern 'right' cue
  });

  // Note: approach recommendations are dispersion-independent by current engine
  // design (recommendApproach ignores ctx.dispersion); adaptation is observable
  // on the tee path + cue only.
});
