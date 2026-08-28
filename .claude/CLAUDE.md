# AI Caddie

Personal offline-first AI caddie for one golfer. Standalone Expo (iOS) app, TypeScript, local SQLite source-of-truth, Convex as additive sync. See `.claude/SPEC.md` (what) and `.claude/BLUEPRINT.md` (build order, 30 steps).

## Architecture

Layers are folders under `src/`. Import direction is enforced by an ESLint boundary rule — **top may import bottom only**:

1. `src/core` — types, enums, units, zod schemas. No imports from elsewhere. Never imports React/SQLite.
2. `src/engine` — pure decision logic. Imports `core` only. No React, SQLite, or I/O. Unit-testable in ms.
3. `src/data` — expo-sqlite + Drizzle schema and repository interfaces (the swap seam). Maps rows ↔ `core` types.
4. `src/sync` — Convex client + local↔cloud reconciliation. Imports `data`.
5. `src/session` — round state machine. Imports `engine` + `data`.
6. `app/` — expo-router screens. Imports `session` (+ `sync` for status).
7. `convex/` — schema, mutations, queries mirroring `core` types.

The zod schemas in `core` are the single shared contract reused by Drizzle and Convex.

## Invariants (don't break these)

- **Offline is never optional.** Recommendations, logging, hole nav, and resume work with zero network for a full round. Nothing on the play path has a hard network dependency. Local SQLite is the source of truth; Convex is additive backup — removable without breaking the app.
- **Engine is pure.** `core`/`engine`/`data`/`session` never touch Convex or React. Keep it that way.
- **Sync is last-write-wins** by `updatedAt`. Single user, no CRDTs. Every record has a stable `id` + `updatedAt`.
- **One recommendation per shot**, six fields: Club, Target, Shape, Best Miss, Do-Not, Cue. Never a menu.
- **Yardage is transparent.** `playsLike` returns itemized terms (base, wind, temp, elevation, strikeTrend) that sum to the displayed total.
- **Tee:** keep driver by default; downgrade only when right-side OB/water/penalty overlaps dispersion. Left-side hazards never downgrade.
- **Approach:** target functional center, never the flag by default.
- **Dispersion adapts at moderate strength** with a per-shot cap — one bad shot can't dominate.
- **Course learning never auto-changes strategy.** Suggestions are approve/reject only.

## Conventions

- TypeScript throughout. Explicit typing on public APIs. Functional components, hooks.
- Logic ships with tests (vitest for pure `src/` modules; `convex-test` for `convex/`).
- Each blueprint step adds one capability, type-checks, tests, and is wired in before the next.

## Commands

- `npm test` — vitest over pure `src/` modules
- `npm run build` — type-check / build
- `npx convex dev` — Convex deployment
