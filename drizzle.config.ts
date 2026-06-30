import { defineConfig } from 'drizzle-kit';

// Generates SQL migrations from the shared sqlite-core schema into ./drizzle.
// Applied at DB-factory init by both drivers (better-sqlite3 in tests, op-sqlite
// on device). Run: `npm run db:generate`.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/data/schema.ts',
  out: './drizzle',
});
