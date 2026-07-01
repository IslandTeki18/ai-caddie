import type { SyncRecord } from '@/core';
import type { SyncRepository } from '@/data';

/**
 * Reconciliation layer (Phase E, blueprint steps 18–19). Local-first,
 * last-write-wins, single user. It only ever writes to the local store through
 * `SyncRepository`; the UI keeps reading locally. `SyncClient` is the Convex
 * seam — a real adapter in production, a fake in tests.
 */

export type SyncStatus = 'synced' | 'pending' | 'offline';

export interface SyncClient {
  upsertFromClient(records: SyncRecord[]): Promise<void>;
  pullSince(since: number): Promise<SyncRecord[]>;
}

export interface ReconcileArgs {
  store: SyncRepository;
  client: SyncClient;
  /** Watermark: epoch ms of the last successful sync (0 to sync everything). */
  lastSync: number;
}

export interface ReconcileResult {
  lastSync: number;
  status: SyncStatus;
}

/**
 * One push/pull pass. Push local rows newer than `lastSync`, pull remote rows
 * newer than `lastSync` into local (LWW by `updatedAt`), and advance the
 * watermark. Any client failure (offline) leaves the watermark untouched so the
 * unpushed edits are re-collected on the next attempt — the queue is implicit.
 */
export async function reconcile({
  store,
  client,
  lastSync,
}: ReconcileArgs): Promise<ReconcileResult> {
  try {
    const local = await store.collectSince(lastSync);
    if (local.length) await client.upsertFromClient(local);

    const remote = await client.pullSince(lastSync);
    if (remote.length) await store.applyRemote(remote);

    const seen = [...local, ...remote].map((r) => r.doc.updatedAt);
    const next = seen.length ? Math.max(lastSync, ...seen) : lastSync;
    return { lastSync: next, status: 'synced' };
  } catch {
    return { lastSync, status: 'offline' };
  }
}

/**
 * Status for the UI indicator. Offline overrides everything (last attempt
 * failed); otherwise pending while local edits await push, else synced.
 */
export function deriveStatus({
  lastError,
  pendingCount,
}: {
  lastError: boolean;
  pendingCount: number;
}): SyncStatus {
  if (lastError) return 'offline';
  return pendingCount > 0 ? 'pending' : 'synced';
}

// The live Convex adapter (createConvexSyncClient) is a separate entry point
// (`@/sync/convex-client`) so importing the pure reconcile logic never drags in
// convex/react — keeps the reconcile/status unit tests React-free.
