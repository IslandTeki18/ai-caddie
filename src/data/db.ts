import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { schema } from './schema';

/**
 * Dual-driver SQLite factory. The decision logic stays driver-agnostic; only
 * this file knows which engine backs the store.
 *
 *  - 'memory'   → better-sqlite3 (Node). Used by every vitest test. `path`
 *                 optional: omit for a private :memory: db, pass a file path to
 *                 prove durability across reopen.
 *  - 'op-sqlite'→ @op-engineering/op-sqlite (device, WAL on). The source of
 *                 truth on the course.
 *
 * Both drivers are loaded via dynamic import() so the unselected one is never
 * resolved — a static `better-sqlite3` import breaks the RN bundle, and a static
 * op-sqlite import breaks Node/vitest (native bindings absent).
 */

const MIGRATIONS_FOLDER = './drizzle';

export type CaddieDb = BetterSQLite3Database<typeof schema>;

export interface DbHandle {
  db: CaddieDb;
  close: () => void;
}

export type DbKind = 'memory' | 'op-sqlite';

export interface CreateDbOptions {
  kind: DbKind;
  /** File path. For 'memory': omit for private in-RAM db. For 'op-sqlite': db name. */
  path?: string;
}

export async function createDb(opts: CreateDbOptions): Promise<DbHandle> {
  if (opts.kind === 'memory') {
    const { default: Database } = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
    const sqlite = new Database(opts.path ?? ':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return { db: db as CaddieDb, close: () => sqlite.close() };
  }

  // op-sqlite (device). Not exercised by tests; native module only. Dynamic
  // import keeps the native module and the .sql-bundling migrations file out of
  // the Node/vitest resolution graph (the memory branch returns above).
  const { open } = await import('@op-engineering/op-sqlite');
  const { drizzle } = await import('drizzle-orm/op-sqlite');
  const { migrate } = await import('drizzle-orm/op-sqlite/migrator');
  const { default: migrations } = await import('../../drizzle/migrations');
  const sqlite = open({ name: opts.path ?? 'ai-caddie.db' });
  sqlite.execute('PRAGMA journal_mode = WAL;');
  sqlite.execute('PRAGMA foreign_keys = ON;');
  const db = drizzle(sqlite, { schema });
  // Apply the drizzle-kit-bundled migrations (./drizzle/migrations.js). Idempotent:
  // the migrator tracks applied migrations in __drizzle_migrations on-device.
  await migrate(db, migrations);
  return { db: db as unknown as CaddieDb, close: () => sqlite.close() };
}
