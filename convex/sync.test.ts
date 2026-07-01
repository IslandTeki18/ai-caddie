// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

/**
 * Convex sync endpoints (blueprint step 17): upsert inserts, a newer client row
 * patches, an older one is ignored (LWW), and pullSince respects the watermark.
 */

const modules = import.meta.glob('./**/*.*s');

const upsert = (doc: Record<string, unknown>) => ({
  records: [{ table: 'course' as const, doc }],
});

test('upsertFromClient is last-write-wins and pullSince honors the watermark', async () => {
  const t = convexTest(schema, modules);

  await t.mutation(api.sync.upsertFromClient, upsert({ id: 'c1', name: 'A', updatedAt: 100 }));
  let rows = await t.query(api.sync.pullSince, { since: 0 });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ table: 'course', doc: { id: 'c1', name: 'A', updatedAt: 100 } });

  // Older row is ignored.
  await t.mutation(api.sync.upsertFromClient, upsert({ id: 'c1', name: 'OLD', updatedAt: 50 }));
  rows = await t.query(api.sync.pullSince, { since: 0 });
  expect(rows[0].doc.name).toBe('A');

  // Equal-or-newer row patches in place (no duplicate).
  await t.mutation(api.sync.upsertFromClient, upsert({ id: 'c1', name: 'B', updatedAt: 200 }));
  rows = await t.query(api.sync.pullSince, { since: 0 });
  expect(rows).toHaveLength(1);
  expect(rows[0].doc.name).toBe('B');

  // Watermark: nothing at/after the latest updatedAt, one before it.
  expect(await t.query(api.sync.pullSince, { since: 200 })).toHaveLength(0);
  expect(await t.query(api.sync.pullSince, { since: 150 })).toHaveLength(1);
});
