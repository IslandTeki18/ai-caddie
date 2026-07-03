import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Round, Shot, ClubBaseline, SyncRecord } from '@/core';
import {
  createDb,
  type DbHandle,
  LocalRoundRepository,
  LocalPlayerRepository,
  SyncRepository,
  type RoundRepository,
} from '@/data';
import { reconcile, type SyncClient } from '@/sync';
import { SessionStore, rehydrate, createSetupState } from '@/session';

/**
 * Step 30 (Phase J): full mocked round end to end, offline then reconnecting.
 *  - 18 holes played with zero network, crash mid-round, resume at the exact
 *    hole/shot, round completion persisted.
 *  - Sync degrades gracefully: offline passes leave the watermark untouched
 *    (implicit queue), reconnecting drains everything to the cloud.
 *  - A failing repository write leaves in-memory state untouched.
 */

const round: Round = {
  id: 'r-full',
  weather: { windMph: 5, tempF: 68 },
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

function shotFor(hole: number, kind: 'tee' | 'approach'): Shot {
  const n = hole * 10 + (kind === 'tee' ? 1 : 2);
  return {
    id: `s-${hole}-${kind}`, roundId: round.id, holeNumber: hole, kind,
    startDirection: 'onLine', curve: 'fade', contact: 'center',
    distance: 'pinHigh', quality: 'good', timestamp: 1000 + n, updatedAt: 1000 + n,
  };
}

/** In-memory Convex stand-in with a network switch. */
function fakeCloud(): { client: SyncClient; docs: Map<string, SyncRecord>; setOnline: (v: boolean) => void } {
  const docs = new Map<string, SyncRecord>();
  let online = false;
  return {
    docs,
    setOnline: (v) => (online = v),
    client: {
      upsertFromClient: async (records) => {
        if (!online) throw new Error('network down');
        for (const r of records) docs.set(`${r.table}:${(r.doc as { id: string }).id}`, r);
      },
      pullSince: async (since) => {
        if (!online) throw new Error('network down');
        return [...docs.values()].filter((r) => (r.doc as { updatedAt: number }).updatedAt > since);
      },
    },
  };
}

describe('hardening (step 30): full offline round, resume, reconnect', () => {
  let dir: string;
  let dbPath: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ai-caddie-hardening-'));
    dbPath = join(dir, 'round.db');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('plays 18 holes offline, survives a mid-round crash, completes, then drains to the cloud', async () => {
    const cloud = fakeCloud(); // starts offline

    // --- Front nine + crash after the tee shot on 10 ------------------------
    let db: DbHandle = await createDb({ kind: 'memory', path: dbPath });
    await new LocalPlayerRepository(db.db).upsertClubBaselines([baseline]);
    let store = new SessionStore(createSetupState(round, [baseline]), new LocalRoundRepository(db.db));
    await store.dispatch({ type: 'SETUP', round, baselines: [baseline] });

    for (let hole = 1; hole <= 9; hole++) {
      await store.dispatch({ type: 'START_HOLE', holeNumber: hole });
      await store.dispatch({ type: 'LOG_SHOT', shot: shotFor(hole, 'tee') });
      await store.dispatch({ type: 'LOG_SHOT', shot: shotFor(hole, 'approach') });
      await store.dispatch({ type: 'COMPLETE_HOLE' });
      await store.dispatch({ type: 'NEXT_HOLE' });
    }
    await store.dispatch({ type: 'LOG_SHOT', shot: shotFor(10, 'tee') });

    // An offline sync pass mid-round must not disturb anything.
    const syncRepo = new SyncRepository(db.db);
    const failed = await reconcile({ store: syncRepo, client: cloud.client, lastSync: await syncRepo.getLastSync() });
    expect(failed.status).toBe('offline');
    expect(failed.lastSync).toBe(0); // watermark untouched → edits stay queued

    db.close(); // simulated crash / app kill

    // --- Relaunch: detect + resume at the exact hole/shot -------------------
    db = await createDb({ kind: 'memory', path: dbPath });
    const rounds = new LocalRoundRepository(db.db);
    const inProgress = await rounds.findInProgressRound();
    expect(inProgress?.id).toBe(round.id);

    const restored = await rehydrate(rounds, new LocalPlayerRepository(db.db), inProgress!.id);
    expect(restored).toBeDefined();
    expect(restored!.holeNumber).toBe(10);
    expect(restored!.shots).toHaveLength(19); // 9 holes × 2 + tee on 10
    expect(restored!.shots.at(-1)).toEqual(shotFor(10, 'tee'));

    // --- Back nine to completion --------------------------------------------
    store = new SessionStore(restored!, rounds);
    await store.dispatch({ type: 'LOG_SHOT', shot: shotFor(10, 'approach') });
    await store.dispatch({ type: 'COMPLETE_HOLE' });
    await store.dispatch({ type: 'NEXT_HOLE' });
    for (let hole = 11; hole <= 18; hole++) {
      await store.dispatch({ type: 'LOG_SHOT', shot: shotFor(hole, 'tee') });
      await store.dispatch({ type: 'LOG_SHOT', shot: shotFor(hole, 'approach') });
      await store.dispatch({ type: 'COMPLETE_HOLE' });
      await store.dispatch({ type: 'NEXT_HOLE' });
    }
    expect(store.state.phase).toBe('roundComplete');

    const completed = await rounds.getRound(round.id);
    expect(completed?.completedAt).toBeGreaterThan(0);
    expect(await rounds.findInProgressRound()).toBeUndefined(); // nothing left to resume

    // --- Reconnect: the queue drains, cloud converges ------------------------
    cloud.setOnline(true);
    const repo = new SyncRepository(db.db);
    const drained = await reconcile({ store: repo, client: cloud.client, lastSync: await repo.getLastSync() });
    expect(drained.status).toBe('synced');
    await repo.setLastSync(drained.lastSync);

    expect(cloud.docs.get(`round:${round.id}`)).toBeDefined();
    expect((cloud.docs.get(`round:${round.id}`)!.doc as Round).completedAt).toBeGreaterThan(0);
    expect([...cloud.docs.keys()].filter((k) => k.startsWith('shot:'))).toHaveLength(36);
    expect(await repo.getLastSync()).toBeGreaterThan(0); // watermark persisted

    db.close();
  });

  it('a failing write leaves in-memory state untouched and surfaces the error', async () => {
    const db = await createDb({ kind: 'memory' });
    const real = new LocalRoundRepository(db.db);
    const failing: RoundRepository = {
      createRound: (r) => real.createRound(r),
      getRound: (id) => real.getRound(id),
      listRounds: () => real.listRounds(),
      completeRound: (id, at) => real.completeRound(id, at),
      setCurrentHole: (id, n, at) => real.setCurrentHole(id, n, at),
      findInProgressRound: () => real.findInProgressRound(),
      listShots: (id) => real.listShots(id),
      addShot: async () => { throw new Error('disk full'); },
    };

    const store = new SessionStore(createSetupState(round, [baseline]), failing);
    await store.dispatch({ type: 'SETUP', round, baselines: [baseline] });
    await store.dispatch({ type: 'START_HOLE', holeNumber: 1 });

    const before = store.state;
    await expect(store.dispatch({ type: 'LOG_SHOT', shot: shotFor(1, 'tee') })).rejects.toThrow('disk full');
    expect(store.state).toBe(before); // persist-before-mutate: no drift from disk
    db.close();
  });
});
