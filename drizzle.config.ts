import { defineConfig } from 'drizzle-kit';

// Generates SQL migrations from the shared sqlite-core schema into ./drizzle.
// Applied at DB-factory init by both drivers (better-sqlite3 in tests, expo-sqlite
// on device). Run: `npm run db:generate`.
export default defineConfig({
  dialect: 'sqlite',
  // `expo` driver bundles migrations into ./drizzle/migrations.js (journal +
  // inlined SQL) for on-device application by the expo-sqlite driver at DB init.
  driver: 'expo',
  schema: './src/data/schema.ts',
  out: './drizzle',
});
