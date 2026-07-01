import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  createDb,
  LocalPlayerRepository,
  LocalCourseRepository,
  LocalRoundRepository,
  type PlayerRepository,
  type CourseRepository,
  type RoundRepository,
} from '@/data';
import {
  SessionStore,
  createSetupState,
  type Action,
  type SessionState,
} from '@/session';
import type { Round, ClubBaseline, PlayerProfile } from '@/core';

export interface Repos {
  players: PlayerRepository;
  courses: CourseRepository;
  rounds: RoundRepository;
}

interface SessionContextValue {
  repos: Repos;
  /** Current round state, or undefined until a round is begun. */
  state?: SessionState;
  dispatch: (action: Action) => Promise<void>;
  beginRound: (
    round: Round,
    baselines: readonly ClubBaseline[],
    profile?: PlayerProfile,
  ) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Root provider: owns the on-device DB + repositories and the live SessionStore.
 * SessionStore is a mutable class, so a version tick forces re-render after each
 * dispatch. Reads always pull fresh `store.state` — the store is captured, never
 * the state, so there is no stale closure.
 *
 * ponytail: version-tick over useSyncExternalStore — one provider, one consumer
 * tree; add a subscribe API to SessionStore only if a second consumer appears.
 */
export function SessionProvider({ children }: { children: ReactNode }): ReactNode {
  const [repos, setRepos] = useState<Repos>();
  const storeRef = useRef<SessionStore | undefined>(undefined);
  const [, tick] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    let closed = false;
    let handle: { close: () => void } | undefined;
    (async () => {
      const db = await createDb({ kind: 'op-sqlite', path: 'ai-caddie.db' });
      handle = db;
      if (closed) return db.close();
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
