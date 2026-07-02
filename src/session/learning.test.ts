import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Course, Hole, Shot } from '@/core';
import { createDb, type DbHandle, LocalCourseRepository, schema } from '@/data';
import { suggestLearning, applyApprovedUpdate } from './learning';

/**
 * Step 27: approved suggestions persist into courseIntelligence; rejected ones
 * change nothing (rejection = never calling applyApprovedUpdate).
 */

const course: Course = { id: 'c1', name: 'Test', updatedAt: 0 };
const hole: Hole = { id: 'h1', courseId: 'c1', number: 1, par: 4, geometry: {}, updatedAt: 0 };

/** Three good tee shots with the same club → a preferredTeeClub suggestion. */
const shots: Shot[] = Array.from({ length: 3 }, (_, i) => ({
  id: `s${i}`,
  roundId: 'r1',
  holeNumber: 1,
  kind: 'tee',
  club: '3W',
  startDirection: 'onLine',
  curve: 'straight',
  contact: 'center',
  distance: 'pinHigh',
  quality: 'good',
  timestamp: i,
  updatedAt: i,
}));

let handle: DbHandle;
let courses: LocalCourseRepository;

beforeEach(async () => {
  handle = await createDb({ kind: 'memory' });
  courses = new LocalCourseRepository(handle.db);
  await courses.saveCourse(course);
  await handle.db.insert(schema.hole).values(hole);
});

afterEach(() => handle.close());

describe('course-learning approve/reject (step 27)', () => {
  it('maps hole numbers to ids and surfaces a suggestion', () => {
    const updates = suggestLearning(shots, { 1: 'h1' });
    expect(updates.some((u) => u.kind === 'preferredTeeClub' && u.holeId === 'h1')).toBe(true);
  });

  it('approval persists the update into courseIntelligence', async () => {
    const [update] = suggestLearning(shots, { 1: 'h1' });
    await applyApprovedUpdate(courses, update, 5000);

    const intel = await courses.getCourseIntelligence('h1');
    expect(intel?.memory.preferredTeeClub).toBe('3W');
    expect(intel?.updatedAt).toBe(5000);
  });

  it('rejection persists nothing', async () => {
    // Rejecting = not calling applyApprovedUpdate.
    const intel = await courses.getCourseIntelligence('h1');
    expect(intel).toBeUndefined();
  });

  it('merges into existing memory instead of clobbering it', async () => {
    await courses.saveCourseIntelligence({
      id: 'ci:h1',
      holeId: 'h1',
      memory: { conditionNotes: 'wind off the right' },
      updatedAt: 100,
    });
    const [update] = suggestLearning(shots, { 1: 'h1' });
    await applyApprovedUpdate(courses, update, 6000);

    const intel = await courses.getCourseIntelligence('h1');
    expect(intel?.memory.conditionNotes).toBe('wind off the right');
    expect(intel?.memory.preferredTeeClub).toBe('3W');
  });
});
