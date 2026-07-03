import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Round, Shot } from '@/core';
import { createDb, type DbHandle } from './db';
import {
  LocalRoundRepository,
  LocalPlayerRepository,
  LocalCourseRepository,
} from './local-repositories';
import type { ClubBaseline, Course, Hole } from '@/core';

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

  it('lists all stored rounds newest-first', async () => {
    const h = await createDb({ kind: 'memory', path: join(dir, 'list.db') });
    const rounds = new LocalRoundRepository(h.db);
    const older: Round = { ...round, id: 'old', startedAt: 500, updatedAt: 500 };
    const newer: Round = { ...round, id: 'new', startedAt: 1500, updatedAt: 1500 };
    await rounds.createRound(older);
    await rounds.createRound(newer);
    const all = await rounds.listRounds();
    h.close();

    expect(all.map((r) => r.id)).toEqual(['new', 'old']);
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

  it('imported course + holes persist, list alphabetically, and re-import is idempotent', async () => {
    const path = join(dir, 'course.db');
    const course: Course = { id: 'gca-24636', name: 'Pebble Beach', updatedAt: 3000 };
    const holes: Hole[] = [
      { id: 'gca-24636-h1', courseId: 'gca-24636', number: 1, par: 4, geometry: { yardage: 378 }, updatedAt: 3000 },
      { id: 'gca-24636-h2', courseId: 'gca-24636', number: 2, par: 5, geometry: { yardage: 507 }, updatedAt: 3000 },
    ];

    const h1 = await createDb({ kind: 'memory', path });
    const c1 = new LocalCourseRepository(h1.db);
    await c1.saveCourse(course);
    await c1.saveHoles(holes);
    await c1.saveCourse({ ...course, name: 'Pebble Beach Golf Links' }); // re-pick updates in place
    await c1.saveHoles(holes);
    h1.close();

    const h2 = await createDb({ kind: 'memory', path });
    const c2 = new LocalCourseRepository(h2.db);
    const courses = await c2.listCourses();
    const loadedHoles = await c2.listHoles('gca-24636');
    h2.close();

    expect(courses).toHaveLength(1);
    expect(courses[0].name).toBe('Pebble Beach Golf Links');
    expect(loadedHoles).toHaveLength(2); // re-import did not duplicate
    expect(loadedHoles.map((h) => h.par)).toEqual([4, 5]);
  });
});
