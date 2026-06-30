import type { Round, ClubBaseline, PlayerProfile } from '@/core';
import type { Action } from './actions';
import { type SessionState, LAST_HOLE } from './state';

/** Initial state from a freshly created round + loaded baselines/profile. */
export function createSetupState(
  round: Round,
  baselines: readonly ClubBaseline[],
  profile?: PlayerProfile,
): SessionState {
  return { phase: 'setup', round, baselines, profile, holeNumber: 1, shots: [] };
}

/**
 * Pure round state machine. Transitions:
 *   setup → teeShot → approach → holeComplete → nextHole/roundComplete.
 * Unknown (phase, action) pairs return state unchanged, keeping the reducer total.
 */
export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'SETUP':
      return createSetupState(action.round, action.baselines, action.profile);

    case 'START_HOLE':
      if (state.phase !== 'setup' && state.phase !== 'holeComplete') return state;
      return { ...state, phase: 'teeShot', holeNumber: action.holeNumber, currentShot: undefined };

    case 'SET_SHOT_CONTEXT':
      if (state.phase !== 'teeShot' && state.phase !== 'approach') return state;
      return { ...state, currentShot: action.input };

    case 'LOG_SHOT': {
      if (state.phase !== 'teeShot' && state.phase !== 'approach') return state;
      // Tee shot advances to the approach; further shots stay in the approach phase.
      return {
        ...state,
        phase: 'approach',
        shots: [...state.shots, action.shot],
        currentShot: undefined,
      };
    }

    case 'COMPLETE_HOLE':
      if (state.phase !== 'teeShot' && state.phase !== 'approach') return state;
      return { ...state, phase: 'holeComplete', currentShot: undefined };

    case 'NEXT_HOLE':
      if (state.phase !== 'holeComplete') return state;
      if (state.holeNumber >= LAST_HOLE) return { ...state, phase: 'roundComplete' };
      return { ...state, phase: 'teeShot', holeNumber: state.holeNumber + 1, currentShot: undefined };

    case 'COMPLETE_ROUND':
      return { ...state, phase: 'roundComplete', currentShot: undefined };

    default:
      return state;
  }
}
