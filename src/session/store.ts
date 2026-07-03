import type { PlayerRepository, RoundRepository } from '@/data';
import type { Action } from './actions';
import { reducer } from './reducer';
import type { SessionState } from './state';

/**
 * Async persistence bridge (step 16). The reducer stays pure; this thin wrapper
 * dispatches and persists only the two actions with durable side effects, so a
 * round survives relaunch with zero network. Local SQLite is the source of truth.
 */
export class SessionStore {
  state: SessionState;

  constructor(
    initial: SessionState,
    private readonly rounds: RoundRepository,
  ) {
    this.state = initial;
  }

  async dispatch(action: Action): Promise<void> {
    const next = reducer(this.state, action);
    // Persist BEFORE mutating in-memory state: a failed write throws to the
    // caller and leaves state untouched, so memory never drifts ahead of disk.
    if (action.type === 'SETUP') await this.rounds.createRound(action.round);
    else if (action.type === 'LOG_SHOT') await this.rounds.addShot(action.shot);
    else if (next.phase === 'roundComplete' && this.state.phase !== 'roundComplete')
      await this.rounds.completeRound(next.round.id, Date.now());
    this.state = next;
  }
}

/**
 * Rebuild session state from local storage (zero network). Phase/position is
 * best-effort — a logged round resumes mid-hole at `approach`, a fresh one at
 * `teeShot`; durability cares only that round + shots are restored.
 */
export async function rehydrate(
  rounds: RoundRepository,
  players: PlayerRepository,
  roundId: string,
): Promise<SessionState | undefined> {
  const round = await rounds.getRound(roundId);
  if (!round) return undefined;

  const shots = await rounds.listShots(roundId);
  const baselines = await players.listClubBaselines();
  const profile = await players.getProfile();
  const last = shots[shots.length - 1];

  return {
    phase: last ? 'approach' : 'teeShot',
    round,
    baselines,
    profile,
    holeNumber: last?.holeNumber ?? 1,
    shots,
    currentShot: undefined,
  };
}
