import type { ConvexReactClient } from 'convex/react';
import type { SyncRecord } from '@/core';
import { api } from '../../convex/_generated/api';
import type { SyncClient } from './index';

/**
 * Live Convex adapter mapping the `SyncClient` seam onto the generated
 * `api.sync` functions. Imperative `.mutation()` / `.query()` (not hooks) so
 * `reconcile` can run outside React. Separate module so the pure sync logic
 * stays importable without pulling in convex/react.
 */
export function createConvexSyncClient(client: ConvexReactClient): SyncClient {
  return {
    upsertFromClient: async (records) => {
      await client.mutation(api.sync.upsertFromClient, { records });
    },
    pullSince: (since) => client.query(api.sync.pullSince, { since }) as Promise<SyncRecord[]>,
  };
}
