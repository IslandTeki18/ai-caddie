// Types for the drizzle-kit-generated `migrations.js` (Expo bundle). The .js is
// consumed at runtime by drizzle-orm/op-sqlite's `migrate()`; this declaration
// lets tsc resolve the import without parsing the inlined `.sql` imports (those
// are turned into strings by babel-plugin-inline-import at bundle time only).
declare const migrations: {
  journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
  migrations: Record<string, string>;
};
export default migrations;
