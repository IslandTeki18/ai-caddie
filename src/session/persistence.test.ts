import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Round, Shot, ClubBaseline } from '@/core';
import { createDb, type DbHandle, LocalRoundRepository, LocalPlayerRepository } from '@/data';
import { SessionStore, rehydrate } from './store';
import { createSetupState } from './reducer';

/**
 * Step 16: a round persisted through the local repositories survives relaunch
 * with zero network. Write via a SessionStore over a real file, drop it, reopen
 * the same file with fresh repos, rehydrate, and assert round + shots restored.
 */

const round: Round = {
  id: 'r1',
  weather: { windMph: 8, tempF: 72 },
  aggressionDefault: 'neutral',
  startedAt: 1000,
  updatedAt: 1000,
};

const baseline: ClubBaseline = {
  id: 'b-driver',
  club: 'Driver',
  distanceYards: 270,
  dispersion: { lateralYards: 15, longYards: 10 },
  tendency: 'stock fade',
  updatedAt: 0,
};

const shots: Shot[] = [
  {
    id: 's1', roundId: 'r1', holeNumber: 1, kind: 'tee',
    startDirection: 'onLine', curve: 'fade', contact: 'center',
    distance: 'pinHigh', quality: 'good', timestamp: 1100, updatedAt: 1100,
  },
  {
    id: 's2', roundId: 'r1', holeNumber: 1, kind: 'approach',
    startDirection: 'left', curve: 'hook', contact: 'thin',
    distance: 'short', quality: 'poor', timestamp: 1200, updatedAt: 1200,
  },
];

describe('session durability (step 16)', () => {
  let dir: string;
  let dbPath: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ai-caddie-session-'));
    dbPath = join(dir, 'round.db');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round + shots logged through the store rehydrate after reopen', async () => {
    const first: DbHandle = await createDb({ kind: 'memory', path: dbPath });
    const writePlayers = new LocalPlayerRepository(first.db);
    await writePlayers.upsertClubBaselines([baseline]);

    const store = new SessionStore(createSetupState(round, [baseline]), new LocalRoundRepository(first.db));
    await store.dispatch({ type: 'SETUP', round, baselines: [baseline] });
    await store.dispatch({ type: 'START_HOLE', holeNumber: 1 });
    for (const s of shots) await store.dispatch({ type: 'LOG_SHOT', shot: s });
    first.close();

    const second: DbHandle = await createDb({ kind: 'memory', path: dbPath });
    const restored = await rehydrate(
      new LocalRoundRepository(second.db),
      new LocalPlayerRepository(second.db),
      'r1',
    );
    second.close();

    expect(restored).toBeDefined();
    expect(restored!.round).toEqual(round);
    expect(restored!.shots).toEqual(shots);
    expect(restored!.baselines).toEqual([baseline]);
    expect(restored!.holeNumber).toBe(1);
  });

  it('rehydrate returns undefined for an unknown round', async () => {
    const h: DbHandle = await createDb({ kind: 'memory', path: dbPath });
    const restored = await rehydrate(new LocalRoundRepository(h.db), new LocalPlayerRepository(h.db), 'nope');
    h.close();
    expect(restored).toBeUndefined();
  });
});
