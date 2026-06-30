# AI Caddie — Build Blueprint

A step-by-step plan for building the offline iPhone AI Caddie, then broken into iterative chunks, then into right-sized, test-driven prompts you can hand to Claude Code one at a time. Each prompt ends by wiring its output into what already exists — nothing is left orphaned.

**Stack:** A single standalone React Native + Expo app, TypeScript throughout. Local-first persistence (on-device SQLite) with Convex as the sync / backup / online layer.

---

## 0. Stack & Architecture Decisions

**Platform:** React Native via Expo (managed workflow), iOS-first. expo-router for file-based navigation. One repo, no monorepo.
**Internal structure:** the layers are folders under `src/`, not packages. The decision logic lives in plain-TypeScript folders with zero React Native / Convex imports, so the brain of the app is testable under vitest in milliseconds — no simulator, no network.
**Keeping the brain pure without package walls:** because there's no workspace boundary to stop `src/engine` from accidentally importing React or SQLite, an ESLint import-boundary rule enforces the dependency direction below. That rule *is* the architecture in a standalone repo — it's what guarantees the engine stays testable in isolation.
**Local persistence (source of truth):** op-sqlite + Drizzle ORM on-device, WAL enabled. This is what makes a 4-hour, zero-signal round actually work: instant reads/writes, survives app-kill, resumes exactly where it left off. The round never depends on the network being up.
**Backend / sync:** Convex (in `convex/` at the repo root — standard for a standalone Expo + Convex app). The local store is the source of truth on the course; Convex is the cloud mirror that syncs when online — backup, cross-device, future web dashboard, and the natural home for seeding TrackMan/coaching baseline data. Single-user app ⇒ sync is **last-write-wins**, no CRDT machinery.
**Session state:** a typed reducer (or a small Zustand store) — no XState unless you later want it.
**Charts:** victory-native (Skia) or react-native-gifted-charts for post-round analytics.

**Folder layout & import direction (top may import bottom only — enforced by ESLint):**

1. `src/core` — value types, enums, units, zod schemas. Plain TS. No imports from elsewhere.
2. `src/engine` — pure decision logic. Imports `src/core` only. No React, no SQLite, no I/O.
3. `src/data` — local op-sqlite/Drizzle schema + repository interfaces. Maps local rows ↔ `core` types. The repository interface is the seam.
4. `src/sync` — Convex client + schema mirror + local↔Convex reconciliation. Observes the local store and pushes/pulls opportunistically. Imports `src/data`.
5. `src/session` — in-round orchestration / round state machine. Imports `src/engine` + `src/data`.
6. `app/` — expo-router screens. Imports `src/session` (+ `src/sync` for status).
7. `convex/` — the Convex deployment: schema, mutations, queries. Mirrors the `core` types.

**Why this shape:** the spec's hardest requirements — transparent yardage math, moderate-strength current-round adaptation, "don't overreact to one bad shot," and *full offline operation* — all live in `core`, `engine`, `data`, and `session`, none of which touch Convex. The session reads and writes only through the local repositories, so the round is correct and durable whether or not Convex is reachable. `src/sync` is additive: if it's removed or offline, the app still works completely; it just stops backing up. That isolation is the whole point, and the ESLint boundary is what keeps it honest.

**One known limitation, on the record:** a glanceable Apple Watch companion (club/target on the wrist over the ball) is native-only and out of reach for Expo. Not a V1 concern, but if it becomes the killer feature it's a separate native target bolted on later.

---

## 1. The Blueprint (phases)

**Phase A — Foundation.** Standalone Expo app + Convex deployment + folder structure, ESLint import boundaries, vitest, CI smoke. Core enums and units.

**Phase B — Domain & local persistence.** Local op-sqlite/Drizzle schema (Player, Club, Course, Hole, Round, Shot, CourseIntelligence). Repository interfaces + local and in-memory implementations. TrackMan baseline import.

**Phase C — The engine.** Yardage adjustment → dispersion → tee logic → approach logic → mental cue selection → recommendation assembler. Pure, fully tested.

**Phase D — Round orchestration.** Round session state machine, shot-log ingestion, moderate current-round adaptation feeding back into the engine.

**Phase E — Convex sync.** Convex schema mirror + mutations/queries, the `src/sync` reconciliation layer (local-first, last-write-wins), graceful offline degradation.

**Phase F — Setup & per-hole UI.** Pre-round setup, per-hole start screen, tee/approach input, recommendation card.

**Phase G — Shot logging UI.** Button-only 1–3s logging screen, wired into adaptation.

**Phase H — Course learning.** Pattern detection → suggested updates → approve/reject flow → persisted intelligence.

**Phase I — Post-round analytics.** Trends, miss patterns, decision review, hole-by-hole learning suggestions.

**Phase J — Hardening.** Offline durability, crash-safe round resume, sync edge cases, accessibility.

---

## 2. Iterative Chunks

Each chunk is a shippable, demoable increment. A chunk is "done" when its tests pass and it's wired into the app.

- **C1 App skeleton** — Expo app + Convex scaffold + folder structure build, app runs, CI green.
- **C2 Core types** — units, enums, the `Recommendation` and `ShotLog` types with zod schemas.
- **C3 Local persistence spine** — Drizzle/op-sqlite schema + repos + a round can be created/loaded offline.
- **C4 Yardage model** — transparent "plays like" calculation.
- **C5 Dispersion model** — baseline + current-round adjustment.
- **C6 Tee logic** — driver-unless-right-side-risk decision.
- **C7 Approach logic** — functional-center targeting.
- **C8 Mental cue + assembler** — full `Recommendation` produced end-to-end.
- **C9 Round session** — state machine driving holes/shots, adaptation loop.
- **C10 Convex sync** — schema mirror + local-first reconciliation + offline tolerance.
- **C11 Setup UI** — pre-round setup persists a round.
- **C12 Per-hole + recommendation UI** — real recs on screen.
- **C13 Logging UI** — fast button logging, feeds adaptation.
- **C14 Course learning** — suggestions + approval.
- **C15 Analytics** — post-round review.
- **C16 Hardening** — resume, durability, sync edges, polish.

---

## 3. Right-Sized Steps

Each step below is one Claude Code prompt. Sizing rule applied: every step adds one coherent capability, ships with its own tests where logic is involved, type-checks, and is integrated before the next begins. Steps that touched too much were split; steps that were trivial were merged.

### C1 — App skeleton
1. Scaffold a standalone Expo app (expo-router, TypeScript). Create the `src/` folder layout from §0 (`core`, `engine`, `data`, `sync`, `session`) and a `convex/` deployment. Add an ESLint import-boundary rule enforcing the dependency direction (engine→core only; data→core; sync→data; session→engine+data; app→session/sync; nothing imports React/SQLite into core or engine). Configure vitest to run the pure `src/` modules. Add one passing test in `src/core`. The app launches to a screen showing "AI Caddie". `npm run build`, `npm test`, and `npx convex dev` all work.

### C2 — Core types
2. In `src/core`, define units and enums from the spec as TS types + zod schemas: `Yardage`, `Elevation ('up'|'flat'|'down')`, `Lie`, `PinLocation`, `Confidence`, `AggressionLevel`, `ShotShape`, and the logging enums `StartDirection ('left'|'onLine'|'right')`, `Curve ('hook'|'straight'|'fade'|'slice')`, `Contact ('thin'|'fat'|'center'|'toe'|'heel')`, `DistanceResult ('short'|'pinHigh'|'long')`, `Quality ('good'|'neutral'|'poor')`. Tests assert zod parse/round-trip for each.
3. In `src/core`, define output types `Recommendation { club, target, shape, bestMiss, doNot, cue }`, `ShotLog { startDirection, curve, contact, distance, quality, timestamp }`, and `ShotKind ('tee'|'approach')`, each with a zod schema. Tests assert construction + schema validation. (These zod schemas are the single shared contract reused later by both the local Drizzle layer and the Convex schema.)

### C3 — Local persistence spine
4. In `src/data`, define the local Drizzle schema (op-sqlite dialect): `playerProfile`, `clubBaseline` (TrackMan distance + dispersion + tendency), `course`, `hole`, `courseIntelligence`, `round`, `shot`, with relations round→holes→shots. Every row carries an `updatedAt` and a stable `id` (for later sync). Add a DB factory with an on-disk op-sqlite variant (WAL enabled) and an in-memory better-sqlite3 variant for tests. Wire Drizzle migrations.
5. In `src/data`, define repository interfaces (`PlayerRepository`, `CourseRepository`, `RoundRepository`) that accept/return `src/core` types — never raw rows — plus local implementations and mappers. Test: create a round, add shots, reload from a fresh in-memory DB, assert equality.
6. In `src/data`, add a TrackMan baseline importer that parses a JSON of per-club distance + dispersion + tendency into `clubBaseline` rows, idempotent on re-import. Include a small fixture and a test.

### C4 — Yardage model
7. In `src/engine`, build `playsLike({ base, wind, temp, elevation, strikeTrend, lie, confidence })` returning a `PlaysLikeBreakdown { base, wind, temp, elevation, strikeTrend, total }` so the math is fully transparent (matches the spec's Base/Wind/Temp/Elevation/Strike display). Tests pin each adjustment term independently, then a combined case (Base 150 → Plays like 159).

### C5 — Dispersion model
8. In `src/engine`, build a dispersion function producing directional dispersion from a `ClubBaseline` (baseline only). Test the output for a known club.
9. Extend it to fold in current-round signal (start direction, curve, contact, distance result) at **moderate** strength, with an explicit single-shot cap. Tests: one bad shot shifts dispersion slightly; five consistent shots shift more; the single-shot cap holds.

### C6 — Tee logic
10. In `src/engine`, build `recommendTee({ hole, dispersion, aggression })`. Default keeps driver (fixed stock-fade model); downgrades only when right-side OB/water/penalty overlaps expected dispersion. Output a partial recommendation. Tests: clean hole keeps driver; right-side water downgrades; left-side hazard does not.

### C7 — Approach logic
11. In `src/engine`, build `recommendApproach({ yardage, lie, elevation, pin, green, dispersion, confidence, aggression })` targeting **functional center**, adjusting for pin, slope/shelves/false fronts, best leave zone, club tendencies, conditions. Tests: front pin + false front pushes target deeper; tucked pin stays center-biased; low confidence widens margin.

### C8 — Mental cue + assembler
12. In `src/engine`, build `selectMentalCue({ confidence, missPattern, aggression })` returning one dynamic cue. Deterministic selection tested for fixed inputs.
13. In `src/engine`, build `recommend(context)` composing yardage → dispersion → tee/approach → cue into one `Recommendation`. One integration test per shot kind producing the spec's exact example fields (Club/Target/Shape/Best Miss/Don't/Cue).

### C9 — Round session
14. In `src/session`, build the round state machine as a typed reducer: `setup → holeStart(n) → teeShot → approach → holeComplete → nextHole/roundComplete`, holding the live round and current-round logs in state. No UI, no network. Tests drive a full 18-hole loop via dispatched actions.
15. In `src/session`, wire `currentRecommendation(state)` to call the engine with live context (profile baselines + this round's logs), updating adaptation inputs on each logged shot. Test: logging poor strikes changes the next "plays like" within the moderate cap.
16. In `src/session`, persist round/shot mutations through the **local** repositories so a round survives relaunch with zero network. Test: build state, log shots, rehydrate from local storage, assert restored. (No Convex involvement — durability is purely local.)

### C10 — Convex sync
17. In `convex/`, define the Convex schema mirroring the `core` types (player, club baselines, course, hole, courseIntelligence, round, shot), reusing the same zod-derived shapes. Add `upsertFromClient` mutations and a `pullSince(updatedAt)` query. Each record keyed by the stable `id` from step 4. Test mutations/queries with the Convex test harness (`convex-test`, runs in Node).
18. In `src/sync`, build the reconciliation layer: on connectivity, push local rows newer than last sync to Convex (`upsertFromClient`) and pull remote rows newer than last sync into the local store, resolving by `updatedAt` (**last-write-wins**, single user). It only ever writes to the local store via the repositories; the UI keeps reading locally. Tests with a mocked Convex client: offline edits queue; on reconnect they push; remote changes pull down; newer timestamp wins both directions.
19. In `app/`, add an unobtrusive sync-status indicator (synced / pending / offline) driven by `src/sync`. Confirm: with the network forced off, a full round plays, logs, and resumes with no errors and status reads "offline"; restoring the network drains the queue.

### C11 — Setup UI
20. In `app/`, build the **Pre-Round Setup** screen (all fields optional): course pick, weather (wind/temp), default aggression, green images/notes; confirm creates a round and routes to hole 1. Component test for the happy path.
21. In `app/`, build the **Player Profile** screen: view/edit club yardages, view TrackMan baselines, miss tendencies, confidence modifiers, persisted via `PlayerRepository`.

### C12 — Per-hole + recommendation UI
22. In `app/`, build the **Per-Hole Start** screen: editable pre-filled hole number, stored course intelligence, pin location, aggression override, with Tee/Approach entry points.
23. In `app/`, build the **Tee Shot input** (elevation, confidence) and **Approach input** (yardage, lie, elevation, pin) screens, dispatching to the session.
24. In `app/`, build the **Recommendation Card** rendering the full `Recommendation` plus an expandable transparent plays-like breakdown. Manual Next-Hole flow only; no live dashboard or between-hole feedback.

### C13 — Logging UI
25. In `app/`, build the **Shot Logging** screen: one button grid (Start Direction / Curve / Contact / Distance / Quality) shared by tee and approach, tuned for a 1–3s tap, dispatching `log(...)`. Test asserts a full log in ≤5 taps.

### C14 — Course learning
26. In `src/engine`, build `detectLearning(historyByHole)` scanning accumulated shots/rounds for per-hole patterns (preferred tee club, safe-miss zones, poor clubs, leave zones, condition notes) and emitting `SuggestedUpdate[]` above a confidence threshold. Pure + tested.
27. In `src/session` + `app/`, surface suggestions after a round as approve/reject cards; approved updates write to `courseIntelligence` (locally, then synced), nothing changes strategy automatically. Test: approval persists, rejection discards.

### C15 — Analytics
28. In `src/engine`, build `analyzeRound(shots)` computing miss patterns, club performance, tee/approach decision quality, green-targeting effectiveness, conservative-vs-aggressive outcomes. Pure + tested.
29. In `app/`, build the **Post-Round Review** screen rendering those analytics (charts via victory-native) plus hole-by-hole learning suggestions and long-term/course-by-course trends aggregated across stored rounds.

### C16 — Hardening
30. Crash-safe round resume + offline/sync sweep: on launch, detect an in-progress round and offer to resume at the exact hole/shot (local durability, WAL + write ordering). Verify the full round path has zero hard network dependency, sync degrades gracefully (queues offline, drains on reconnect, last-write-wins holds), repositories handle write failures, and the logging grid has accessibility (large tap targets, screen-reader labels). Final integration test plays a full mocked round end to end, offline then reconnecting.

---

## 4. Sizing Review

I walked the list twice. Adjustments made so it's safe-but-meaningful:

- **Dispersion split (steps 8/9).** Baseline dispersion and current-round adaptation were one step; the adaptation cap ("don't overreact to one bad shot") is subtle enough to deserve its own tested step.
- **Engine assembler isolated (step 13).** Composing the full recommendation is its own step rather than tacked onto approach logic, so the end-to-end contract gets a dedicated integration test matching the spec's example output.
- **Local persistence proven before sync (steps 16 vs 17–19).** Round durability is established purely locally first, with zero Convex involvement, so offline correctness is never entangled with sync. Convex then arrives as three isolated steps — schema, reconciliation, status — and step 19 explicitly proves a full round survives with the network off.
- **Sync reconciliation isolated (step 18).** Last-write-wins push/pull is its own tested step against a mocked Convex client, so the conflict rule is verified without a live deployment.

Nothing left is large enough to be risky (each is one module concern with its own tests) and nothing is so small it's busywork. Steps 1, 18, 20, 24, 25, and 29 are the heaviest — each is still a single screen, the project setup, or the one reconciliation routine, which is the right granularity for one Claude Code session.

---

## 5. Code-Gen Prompt Series

Hand these to Claude Code in order. Each assumes the prior steps exist and ends integrated.

> **Prompt 1.** Scaffold a standalone Expo app using expo-router and TypeScript. Create the folder layout `src/core`, `src/engine`, `src/data`, `src/sync`, `src/session`, and a `convex/` deployment. Add an ESLint import-boundary rule enforcing the dependency direction: engine→core only, data→core, sync→data, session→engine+data, app→session/sync; and forbid importing React/React Native/SQLite into `src/core` or `src/engine`. Configure vitest to run the pure `src/` modules. Add one passing test in `src/core`. The app should launch to a screen displaying "AI Caddie". Confirm `npm run build`, `npm test`, and `npx convex dev` all work.

> **Prompt 2.** In `src/core`, add the spec's domain enums and unit types as TS types plus zod schemas: `Yardage`, `Elevation`, `Lie`, `PinLocation`, `Confidence`, `AggressionLevel`, `ShotShape`, and the logging enums `StartDirection`, `Curve`, `Contact`, `DistanceResult`, `Quality`. Add tests asserting zod parse and round-trip for each.

> **Prompt 3.** In `src/core`, add output types `Recommendation` (club, target, shape, bestMiss, doNot, cue), `ShotLog` (startDirection, curve, contact, distance, quality, timestamp), and `ShotKind ('tee'|'approach')`, each with a zod schema. Add construction + validation tests. These zod schemas are the shared contract reused by both the local Drizzle layer and the Convex schema later.

> **Prompt 4.** In `src/data`, define the local Drizzle schema for op-sqlite: `playerProfile`, `clubBaseline`, `course`, `hole`, `courseIntelligence`, `round`, `shot`, with relations round→holes→shots. Every row has a stable `id` and an `updatedAt` (for later sync). Add a DB factory with an on-disk op-sqlite variant (WAL enabled) and an in-memory better-sqlite3 variant for tests. Wire Drizzle migrations. No mapping logic yet.

> **Prompt 5.** In `src/data`, add `PlayerRepository`, `CourseRepository`, `RoundRepository` interfaces that accept and return `src/core` types (never raw rows), plus local implementations and mappers. Test: create a round, add shots, reload from a fresh in-memory DB, assert equality.

> **Prompt 6.** In `src/data`, add a TrackMan baseline importer that parses a JSON of per-club distance + dispersion + tendency into `clubBaseline` rows, idempotent on re-import. Include a small fixture and a test.

> **Prompt 7.** In `src/engine`, implement `playsLike(...)` returning a `PlaysLikeBreakdown { base, wind, temp, elevation, strikeTrend, total }` so every adjustment is itemized. Test each term independently, then a combined case matching the spec example (Base 150 → Plays like 159).

> **Prompt 8.** In `src/engine`, implement a dispersion function producing directional dispersion from a `ClubBaseline` (baseline only). Test the output for a known club.

> **Prompt 9.** Extend the dispersion function to fold current-round signal (start direction, curve, contact, distance) into the baseline at moderate strength, with an explicit single-shot cap. Tests: one bad shot shifts slightly; five consistent shots shift more; the single-shot cap holds.

> **Prompt 10.** In `src/engine`, implement `recommendTee(...)`: default keep driver with a fixed stock-fade model, downgrade only when right-side OB/water/penalty overlaps expected dispersion. Output a partial recommendation. Tests: clean hole keeps driver; right-side water downgrades; left-side hazard does not.

> **Prompt 11.** In `src/engine`, implement `recommendApproach(...)` targeting functional center, adjusting for pin, slope/shelves/false fronts, best leave zone, club tendencies, conditions, confidence. Tests: front pin + false front pushes target deeper; tucked pin stays center-biased; low confidence widens margin.

> **Prompt 12.** In `src/engine`, implement `selectMentalCue(...)` returning one dynamic cue from confidence, miss pattern, and aggression. Deterministic selection tested for fixed inputs.

> **Prompt 13.** In `src/engine`, implement `recommend(context)` composing yardage → dispersion → tee/approach → cue into one `Recommendation`. Add one integration test per shot kind producing the spec's exact example fields.

> **Prompt 14.** In `src/session`, implement the round state machine as a typed reducer (`setup → holeStart → teeShot → approach → holeComplete → nextHole/roundComplete`) holding the live round and current-round logs, no UI and no network. Test a full 18-hole loop via dispatched actions.

> **Prompt 15.** In `src/session`, implement `currentRecommendation(state)` calling the engine with live context (profile baselines + this round's logs), updating adaptation inputs on each logged shot. Test: logging poor strikes changes the next "plays like" within the moderate cap.

> **Prompt 16.** In `src/session`, persist round/shot mutations through the local repositories so a round survives relaunch with zero network. Test: build state, log shots, rehydrate from local storage, assert restored. Do not involve Convex — durability here is purely local.

> **Prompt 17.** In `convex/`, define the Convex schema mirroring the core types (player, club baselines, course, hole, courseIntelligence, round, shot), reusing the zod-derived shapes. Add `upsertFromClient` mutations and a `pullSince(updatedAt)` query, every record keyed by the stable client `id`. Test the mutations and query with `convex-test`.

> **Prompt 18.** In `src/sync`, build the reconciliation layer: on connectivity, push local rows newer than last sync to Convex via `upsertFromClient`, and pull remote rows newer than last sync into the local store, resolving by `updatedAt` (last-write-wins, single user). It must only write to the local store through the repositories; the UI keeps reading locally. Test with a mocked Convex client: offline edits queue, push on reconnect, remote changes pull down, newer timestamp wins both directions.

> **Prompt 19.** In `app/`, add an unobtrusive sync-status indicator (synced / pending / offline) driven by `src/sync`. Verify: with the network forced off, a full round plays, logs, and resumes with no errors and status reads "offline"; restoring the network drains the queue.

> **Prompt 20.** In `app/`, build the Pre-Round Setup screen (all fields optional): course pick, weather, default aggression, green images/notes; confirm creates a round and routes to hole 1. Add a happy-path component test.

> **Prompt 21.** In `app/`, build the Player Profile screen to view/edit club yardages, view TrackMan baselines, miss tendencies, and confidence modifiers, persisted via `PlayerRepository`.

> **Prompt 22.** In `app/`, build the Per-Hole Start screen: editable pre-filled hole number, stored course intelligence, pin location, aggression override, with Tee/Approach entry points.

> **Prompt 23.** In `app/`, build the Tee Shot input (elevation, confidence) and Approach input (yardage, lie, elevation, pin) screens, dispatching to the session.

> **Prompt 24.** In `app/`, build the Recommendation Card rendering the full `Recommendation` plus an expandable transparent plays-like breakdown. Manual Next-Hole flow only; no live dashboard or between-hole feedback.

> **Prompt 25.** In `app/`, build the Shot Logging screen: one button grid (Start Direction / Curve / Contact / Distance / Quality) shared by tee and approach, tuned for a 1–3s tap, dispatching `log(...)`. Test asserts a full log in ≤5 taps.

> **Prompt 26.** In `src/engine`, implement `detectLearning(...)` scanning accumulated shots/rounds for per-hole patterns (preferred tee club, safe-miss zones, poor clubs, leave zones, condition notes) and emitting `SuggestedUpdate[]` above a confidence threshold. Pure + tested.

> **Prompt 27.** In `src/session`/`app/`, surface suggestions after a round as approve/reject cards; approved updates write to `courseIntelligence` (locally, then synced), nothing changes strategy automatically. Test approval persists, rejection discards.

> **Prompt 28.** In `src/engine`, implement `analyzeRound(shots)` computing miss patterns, club performance, tee/approach decision quality, green-targeting effectiveness, and conservative-vs-aggressive outcomes. Pure + tested.

> **Prompt 29.** In `app/`, build the Post-Round Review screen rendering those analytics (charts via victory-native) plus hole-by-hole learning suggestions and long-term/course-by-course trends aggregated across stored rounds.

> **Prompt 30.** Crash-safe resume + offline/sync sweep: on launch, detect an in-progress round and offer to resume at the exact hole/shot (local durability, WAL + write ordering). Verify the full round path has zero hard network dependency, sync degrades gracefully (queues offline, drains on reconnect, last-write-wins holds), repositories handle write failures, and the logging grid has accessibility (large tap targets, screen-reader labels). Add a final integration test playing a full mocked round end to end, offline then reconnecting.