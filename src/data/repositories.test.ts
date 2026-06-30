import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Round, Shot } from '@/core';
import { createDb, type DbHandle } from './db';
import {
  LocalRoundRepository,
  LocalPlayerRepository,
} from './local-repositories';
import type { ClubBaseline } from '@/core';

/**
 * Proves local durability (the offline-is-never-optional invariant): write
 * through one repo instance over a real file, drop it, reopen the same file with
 * a brand-new factory + repo instance, and assert the data survived intact.
 */

const round: Round = {
  id: 'r1',
  weather: { windMph: 8, tempF: 72 },
  aggressionDefault: 'neutral',
  startedAt: 1000,
  updatedAt: 1000,
};

const shots: Shot[] = [
  {
    id: 's1',
    roundId: 'r1',
    holeNumber: 1,
    kind: 'tee',
    startDirection: 'onLine',
    curve: 'fade',
    contact: 'center',
    distance: 'pinHigh',
    quality: 'good',
    timestamp: 1100,
    updatedAt: 1100,
  },
  {
    id: 's2',
    roundId: 'r1',
    holeNumber: 1,
    kind: 'approach',
    startDirection: 'left',
    curve: 'hook',
    contact: 'thin',
    distance: 'short',
    quality: 'poor',
    timestamp: 1200,
    updatedAt: 1200,
  },
];

describe('local repositories durability', () => {
  let dir: string;
  let dbPath: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ai-caddie-'));
    dbPath = join(dir, 'round.db');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round + shots survive reopen from a fresh DB/repo instance', async () => {
    const first: DbHandle = await createDb({ kind: 'memory', path: dbPath });
    const writeRounds = new LocalRoundRepository(first.db);
    await writeRounds.createRound(round);
    for (const s of shots) await writeRounds.addShot(s);
    first.close();

    const second: DbHandle = await createDb({ kind: 'memory', path: dbPath });
    const readRounds = new LocalRoundRepository(second.db);
    const loadedRound = await readRounds.getRound('r1');
    const loadedShots = await readRounds.listShots('r1');
    second.close();

    expect(loadedRound).toEqual(round);
    expect(loadedShots).toEqual(shots); // ordered by timestamp
  });

  it('club baselines upsert idempotently by club across reopen', async () => {
    const baseline: ClubBaseline = {
      id: 'b1',
      club: '7i',
      distanceYards: 165,
      dispersion: { lateralYards: 8, longYards: 6 },
      tendency: 'slight pull',
      updatedAt: 2000,
    };

    const h1 = await createDb({ kind: 'memory', path: dbPath });
    const players1 = new LocalPlayerRepository(h1.db);
    await players1.upsertClubBaselines([baseline]);
    // Re-upsert the same club with a different id → must update in place, not add.
    await players1.upsertClubBaselines([{ ...baseline, id: 'b2', distanceYards: 168 }]);
    h1.close();

    const h2 = await createDb({ kind: 'memory', path: dbPath });
    const players2 = new LocalPlayerRepository(h2.db);
    const all = await players2.listClubBaselines();
    h2.close();

    expect(all).toHaveLength(1);
    expect(all[0].club).toBe('7i');
    expect(all[0].distanceYards).toBe(168);
    expect(all[0].id).toBe('b1'); // original id preserved
  });
});
