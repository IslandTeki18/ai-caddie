import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Course, Round, SyncRecord } from '@/core';
import {
  createDb,
  type DbHandle,
  SyncRepository,
  LocalRoundRepository,
  LocalCourseRepository,
} from '@/data';
import { reconcile, type SyncClient } from './index';

/**
 * Reconciliation against a fake in-memory Convex (blueprint step 18): offline
 * edits queue, push on reconnect, remote changes pull down, and the newer
 * `updatedAt` wins in both directions.
 */

/** In-memory stand-in for the Convex deployment, with an offline toggle. */
class FakeRemote {
  online = true;
  readonly rows = new Map<string, SyncRecord>();

  private guard() {
    if (!this.online) throw new Error('offline');
  }

  client: SyncClient = {
    upsertFromClient: async (records) => {
      this.guard();
      for (const r of records) {
        const key = `${r.table}:${r.doc.id}`;
        const existing = this.rows.get(key);
        if (!existing || r.doc.updatedAt >= existing.doc.updatedAt) this.rows.set(key, r);
      }
    },
    pullSince: async (since) => {
      this.guard();
      return [...this.rows.values()].filter((r) => r.doc.updatedAt > since);
    },
  };

  seed(record: SyncRecord) {
    this.rows.set(`${record.table}:${record.doc.id}`, record);
  }
}

const round = (updatedAt: number): Round => ({
  id: 'r1',
  weather: { windMph: 5 },
  aggressionDefault: 'neutral',
  startedAt: 1000,
  updatedAt,
});

const course = (id: string, name: string, updatedAt: number): Course => ({
  id,
  name,
  updatedAt,
});

describe('reconcile (last-write-wins, local-first)', () => {
  let handle: DbHandle;
  let store: SyncRepository;
  let rounds: LocalRoundRepository;
  let courses: LocalCourseRepository;
  let remote: FakeRemote;

  beforeEach(async () => {
    handle = await createDb({ kind: 'memory' });
    store = new SyncRepository(handle.db);
    rounds = new LocalRoundRepository(handle.db);
    courses = new LocalCourseRepository(handle.db);
    remote = new FakeRemote();
  });

  afterEach(() => handle.close());

  it('queues offline edits, then pushes them on reconnect', async () => {
    await rounds.createRound(round(1000));

    remote.online = false;
    const offline = await reconcile({ store, client: remote.client, lastSync: 0 });
    expect(offline.status).toBe('offline');
    expect(offline.lastSync).toBe(0); // watermark unchanged → still queued
    expect(remote.rows.size).toBe(0);

    remote.online = true;
    const online = await reconcile({ store, client: remote.client, lastSync: 0 });
    expect(online.status).toBe('synced');
    expect(online.lastSync).toBe(1000); // watermark advanced
    expect(remote.rows.get('round:r1')?.doc).toEqual(round(1000));
  });

  it('pulls remote changes down into the local store', async () => {
    remote.seed({ table: 'course', doc: course('c1', 'Pebble', 500) });

    const res = await reconcile({ store, client: remote.client, lastSync: 0 });
    expect(res.status).toBe('synced');
    expect(await courses.getCourse('c1')).toEqual(course('c1', 'Pebble', 500));
  });

  it('newer updatedAt wins on pull; older remote never overwrites newer local', async () => {
    await courses.saveCourse(course('c1', 'Local v2', 2000));

    // Remote is older → must be ignored.
    remote.seed({ table: 'course', doc: course('c1', 'Remote v1', 1000) });
    await reconcile({ store, client: remote.client, lastSync: 0 });
    expect((await courses.getCourse('c1'))?.name).toBe('Local v2');

    // Remote is newer → must win.
    remote.seed({ table: 'course', doc: course('c1', 'Remote v3', 3000) });
    await reconcile({ store, client: remote.client, lastSync: 0 });
    expect((await courses.getCourse('c1'))?.name).toBe('Remote v3');
  });

  it('newer local wins on push (LWW both directions)', async () => {
    remote.seed({ table: 'round', doc: round(1000) });
    await rounds.createRound(round(5000)); // local strictly newer

    await reconcile({ store, client: remote.client, lastSync: 0 });
    expect(remote.rows.get('round:r1')?.doc.updatedAt).toBe(5000);
  });
});
