import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  createDb,
  LocalPlayerRepository,
  LocalCourseRepository,
  LocalRoundRepository,
  SyncRepository,
  type PlayerRepository,
  type CourseRepository,
  type RoundRepository,
} from '@/data';
import { reconcile, type SyncClient, type SyncStatus } from '@/sync';
import {
  SessionStore,
  createSetupState,
  rehydrate,
  type Action,
  type SessionState,
} from '@/session';
import type { Round, ClubBaseline, PlayerProfile } from '@/core';

const SYNC_INTERVAL_MS = 15_000;

export interface Repos {
  players: PlayerRepository;
  courses: CourseRepository;
  rounds: RoundRepository;
}

interface SessionContextValue {
  repos: Repos;
  /** Current round state, or undefined until a round is begun. */
  state?: SessionState;
  /** Live sync indicator; 'offline' until a pass succeeds (or no client). */
  syncStatus: SyncStatus;
  dispatch: (action: Action) => Promise<void>;
  beginRound: (
    round: Round,
    baselines: readonly ClubBaseline[],
    profile?: PlayerProfile,
  ) => Promise<void>;
  /** Crash-safe resume: rehydrate a persisted round into a live store. */
  resumeRound: (roundId: string) => Promise<boolean>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Root provider: owns the on-device DB + repositories, the live SessionStore,
 * and the background reconcile loop (additive — the app is fully functional
 * with no client). SessionStore is a mutable class, so a version tick forces
 * re-render after each dispatch. Reads always pull fresh `store.state` — the
 * store is captured, never the state, so there is no stale closure.
 *
 * ponytail: version-tick over useSyncExternalStore — one provider, one consumer
 * tree; add a subscribe API to SessionStore only if a second consumer appears.
 */
export function SessionProvider({
  children,
  syncClient,
}: {
  children: ReactNode;
  /** Convex seam; omit to run fully offline (badge reads "offline"). */
  syncClient?: SyncClient;
}): ReactNode {
  const [repos, setRepos] = useState<Repos>();
  const syncRepoRef = useRef<SyncRepository | undefined>(undefined);
  const storeRef = useRef<SessionStore | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [, tick] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    let closed = false;
    let handle: { close: () => void } | undefined;
    (async () => {
      const db = await createDb({ kind: 'expo-sqlite', path: 'ai-caddie.db' });
      handle = db;
      if (closed) return db.close();
      syncRepoRef.current = new SyncRepository(db.db);
      setRepos({
        players: new LocalPlayerRepository(db.db),
        courses: new LocalCourseRepository(db.db),
        rounds: new LocalRoundRepository(db.db),
      });
    })();
    return () => {
      closed = true;
      handle?.close();
    };
  }, []);

  // Background reconcile loop (steps 18–19, wired on-device). Push/pull with a
  // persisted watermark; any failure reads "offline" and the next tick retries —
  // the queue is implicit in collectSince(lastSync).
  useEffect(() => {
    const store = syncRepoRef.current;
    if (!repos || !store || !syncClient) return;
    let stopped = false;

    const pass = async () => {
      try {
        const lastSync = await store.getLastSync();
        if ((await store.collectSince(lastSync)).length > 0 && !stopped) setSyncStatus('pending');
        const result = await reconcile({ store, client: syncClient, lastSync });
        if (result.lastSync !== lastSync) await store.setLastSync(result.lastSync);
        if (!stopped) setSyncStatus(result.status);
      } catch {
        if (!stopped) setSyncStatus('offline'); // even watermark reads must never crash the app
      }
    };

    void pass();
    const id = setInterval(() => void pass(), SYNC_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [repos, syncClient]);

  if (!repos) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-slate-400">Loading…</Text>
      </View>
    );
  }

  const value: SessionContextValue = {
    repos,
    state: storeRef.current?.state,
    syncStatus,
    dispatch: async (action) => {
      if (!storeRef.current) return;
      await storeRef.current.dispatch(action);
      tick();
    },
    beginRound: async (round, baselines, profile) => {
      storeRef.current = new SessionStore(
        createSetupState(round, baselines, profile),
        repos.rounds,
      );
      await storeRef.current.dispatch({ type: 'SETUP', round, baselines, profile });
      tick();
    },
    resumeRound: async (roundId) => {
      const restored = await rehydrate(repos.rounds, repos.players, roundId);
      if (!restored) return false;
      storeRef.current = new SessionStore(restored, repos.rounds);
      tick();
      return true;
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Full context (repos + optional active round). */
export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext must be used within <SessionProvider>');
  return ctx;
}

/** Repositories only — for screens that work without an active round (e.g. profile). */
export function useRepos(): Repos {
  return useSessionContext().repos;
}
