# Ubiquitous Language

**Source of truth for all terminology in AI Caddie.** Every human and AI agent working in this codebase must use these exact terms. When code and this document disagree, one of them is a bug — resolve it, don't route around it.

> **Scope note.** AI Caddie is a single-user, offline-first Expo (iOS) app. Local SQLite is the source of truth; Convex is additive backup synced last-write-wins. There is **no Clerk, no auth layer, no multi-user model, and no Turborepo/monorepo** — those concepts do not exist here and must not be introduced into the language. Section 4 documents the only external boundary that does exist: the Convex sync seam.

Identifiers below are quoted exactly as they appear in code. Files are cited so the definition can be verified against its implementation.

---

## 1. Core Entities

The seven persisted entities. Each carries a stable `id` (`string`, from `newId()` in `src/core/id.ts`) and `updatedAt` (`number`, epoch ms) for last-write-wins sync. Zod schemas in `src/core/entities.ts` are the single shared contract, reused by Drizzle (`src/data/schema.ts`) and Convex (`convex/schema.ts`).

### PlayerProfile
- **Definition:** The single golfer's identity plus learned per-situation adjustment knobs.
- **Database representation:** Table `playerProfile`. Fields: `id`, `name?`, `confidenceModifiers` (`Record<string, number>`, JSON), `missTendencies` (`Record<string, string>`, JSON), `updatedAt`. Convex/Drizzle store the two records as JSON columns.
- **Aliases to avoid:** never `User`, `Account`, `Golfer`, or `Player` (as a table name). The entity is `PlayerProfile`; "the Player" is the human, not the record.

### ClubBaseline
- **Definition:** One club's TrackMan-derived distance and dispersion baseline, plus its directional tendency.
- **Database representation:** Table `clubBaseline`. Fields: `id`, `club`, `distanceYards`, `dispersion` (`{ lateralYards, longYards }`, JSON), `tendency`, `updatedAt`.
- **Aliases to avoid:** never `ClubStat`, `ClubProfile`, `Distance`, or `Yardage` for this record. Yardage is a computed output (see `PlaysLikeBreakdown`), not this baseline.

### Course
- **Definition:** A played golf course, identified by name.
- **Database representation:** Table `course`. Fields: `id`, `name`, `updatedAt`.
- **Aliases to avoid:** never `Track`, `Layout`, or `Venue`.

### Hole
- **Definition:** One hole within a course, with par and geometry.
- **Database representation:** Table `hole`. Fields: `id`, `courseId`, `number`, `par`, `geometry` (`HoleGeometry`, JSON, passthrough for unknown fields), `updatedAt`. Relation: `course` → `holes`.
- **Aliases to avoid:** never `Green` (the green is part of `geometry`, not the hole) or `HoleNumber` for the record (that is a scalar field).

### CourseIntelligence
- **Definition:** Learned, per-hole memory: preferred tee club, target line, safe-miss zones, green intel, leave zones, poorly-performing clubs, condition notes.
- **Database representation:** Table `courseIntelligence`, keyed to a hole via `holeId`. Fields: `id`, `holeId`, `memory` (`CourseIntelligenceMemory`, JSON, passthrough), `updatedAt`. Relation: `hole` → `courseIntelligence`.
- **Aliases to avoid:** never `Insight`, `Knowledge`, `HoleNotes`, or `Learning` for the *stored* record. "Learning" refers to the *detection process* (see `detectLearning` / LearningSuggestion), not this table.

### Round
- **Definition:** A single played round — its course reference, conditions, and default aggression.
- **Database representation:** Table `round`. Fields: `id`, `courseId?`, `weather` (`{ windMph?, tempF? }`, JSON), `aggressionDefault`, `startedAt`, `updatedAt`.
- **Aliases to avoid:** never `Game`, `Session` (that word is reserved for the in-memory state machine, see §3), or `Match`.

### Shot
- **Definition:** One logged tee or approach result.
- **Database representation:** Table `shot`. Fields: `id`, `roundId`, `holeNumber`, `kind` (`ShotKind`), `startDirection`, `curve`, `contact`, `distance`, `quality`, `timestamp`, `updatedAt`. Relation: `round` → `shots`. The un-persisted observation shape is `ShotLog` (`src/core/shot.ts`): the six result fields without `id`/`roundId`/`holeNumber`/`kind`.
- **Aliases to avoid:** never `Swing`, `Stroke`, or `Log` for the record. A `ShotLog` is the raw input; a `Shot` is the persisted entity.

### Nested value objects (not top-level tables)

| Object | Meaning | Source |
| --- | --- | --- |
| `Dispersion` | Per-club spread in yards: `{ lateralYards, longYards }`. | `src/core/entities.ts` |
| `DispersionEllipse` | Engine working shape: `{ lateralYards, longYards, biasYards }`. Distinct from stored `Dispersion` — carries directional `biasYards`. | `src/engine/dispersion.ts` |
| `Weather` | `{ windMph?, tempF? }`. | `src/core/entities.ts` |
| `HoleGeometry` | Loose green/hole shape; `notes?` + passthrough. | `src/core/entities.ts` |
| `CourseIntelligenceMemory` | Structured per-hole learning payload. | `src/core/entities.ts` |
| `Recommendation` | The six-field per-shot output. See §2. | `src/core/recommendation.ts` |
| `PlaysLikeBreakdown` | Itemized yardage terms summing to a total. See §2. | `src/engine/plays-like.ts` |

---

## 2. Core Actions & Workflows

Actions split into three tiers: **engine** (pure functions, `src/engine`), **session** (state-machine actions, `src/session`), and **sync/persistence** (`src/sync`, `convex/`). Use the exact function/action names below.

### Engine actions (pure, `src/engine`)

| Term | Definition & resulting value | Trigger |
| --- | --- | --- |
| `recommend` | Assembles the single six-field `Recommendation`. Routes to `recommendTee` or `recommendApproach` by `ShotKind`, applies `selectMentalCue`, derives `bestMiss`/`doNot` from shape, validates against `RecommendationSchema`. | Called by the session/UI when the player requests a recommendation. |
| `recommendTee` | Returns `Partial<Recommendation>` for a tee shot. Keeps `"Driver"` by default; downgrades to `"3-wood"` only when the right edge of the dispersion ellipse overlaps a right-side `ob`/`water`/`penalty` hazard. Left-side hazards never downgrade. | Called by `recommend` when `kind === 'tee'`. |
| `recommendApproach` | Returns an `ApproachPlan` targeting **functional center**, never the flag by default. Applies false-front depth push, tucked-pin lateral lean, and confidence margin. | Called by `recommend` when `kind === 'approach'`. |
| `playsLike` | Returns `PlaysLikeBreakdown`: five signed terms (`base`, `wind`, `temp`, `elevation`, `strikeTrend`) that **sum to** the displayed total. Applies lie and confidence penalties. | Called during approach recommendation / yardage display. |
| `baselineDispersion` | Extracts a `DispersionEllipse` from a `ClubBaseline` (`biasYards = 0`). | Called before adaptation. |
| `adaptDispersion` | Folds current-round `ShotLog[]` into the baseline ellipse at **moderate** strength; each shot's contribution is clamped by `PER_SHOT_BIAS_CAP` / `PER_SHOT_WIDTH_CAP` so one shot cannot dominate. | Called per shot as the round progresses. |
| `selectMentalCue` | Returns one deterministic cue string from confidence, miss pattern, and aggression. Same input → same cue. | Called by `recommend`. |
| `detectLearning` | **SPEC-defined (§7, P1-1), not yet implemented** — no such function exists in `src/engine` as of this branch. When built, it must scan accumulated shots/rounds for per-hole patterns and **emit approve/reject suggestions only**, never write strategy directly. Do not reference it as callable code until it exists. | Post-round (planned; see §3, `roundComplete`). |

**The recommendation invariant:** `recommend` always yields exactly six fields — `club`, `target`, `shape`, `bestMiss`, `doNot`, `cue` — never a menu. Do not add a seventh field or return a list.

### Session actions (state-machine, `src/session/actions.ts`)

Dispatched against the reducer in `src/session/reducer.ts`. See §3 for the state transitions each drives.

`SETUP`, `START_HOLE`, `SET_SHOT_CONTEXT`, `LOG_SHOT`, `COMPLETE_HOLE`, `NEXT_HOLE`, `COMPLETE_ROUND`.

- **Aliases to avoid:** never `advanceHole`, `nextShot`, `endRound`, or `saveShot` in prose or code — use the exact action constant. "Log a shot" maps to `LOG_SHOT`; "next hole" maps to `NEXT_HOLE`.

### Sync / persistence actions

| Term | Definition & resulting state | Trigger |
| --- | --- | --- |
| `reconcile` | Full local↔cloud sync pass: push local rows newer than `lastSync`, pull remote rows newer than `lastSync`, advance the watermark. Any client error leaves `lastSync` untouched (implicit retry). | Called opportunistically when online. Never on the play path. |
| `upsertFromClient` (Convex mutation) | Inserts unseen `id`s; patches existing only if incoming `updatedAt >= existing.updatedAt` (LWW). | Called by `reconcile` push. |
| `pullSince` (Convex query) | Returns all records with `updatedAt > since` across the seven tables, stripped of Convex system fields. | Called by `reconcile` pull. |
| `collectSince` / `applyRemote` (`SyncRepository`) | Local side of push/pull: gather rows since watermark / LWW-merge remote rows. | Called within `reconcile`. |

- **Aliases to avoid:** never `push`/`pull`/`save`/`backup` as the canonical name — use `reconcile`, `upsertFromClient`, `pullSince`. "Sync" is the concept; `reconcile` is the operation.

---

## 3. States & Statuses

### Round session lifecycle (`src/session/reducer.ts`)

The in-memory state machine. **"Session" always means this machine, never a persisted `Round` record and never an auth session** (there is no auth). Five phases:

| State | Definition & entry criteria |
| --- | --- |
| `setup` | Round loaded, no hole started. Entered by `SETUP`. Awaiting `START_HOLE`. |
| `teeShot` | On a hole, awaiting the tee shot. Entered by `START_HOLE` (from `setup` or `holeComplete`) or by `NEXT_HOLE`. `currentShot` cleared on entry. |
| `approach` | Tee logged; awaiting approach shots or hole completion. Entered by `LOG_SHOT` from `teeShot`. Further `LOG_SHOT`s stay in `approach`. |
| `holeComplete` | Hole finished. Entered by `COMPLETE_HOLE` (from `teeShot` or `approach`). Awaiting `NEXT_HOLE` or `COMPLETE_ROUND`. |
| `roundComplete` | Terminal. Entered by `NEXT_HOLE` when `holeNumber >= 18`, or by `COMPLETE_ROUND` from any state. Post-round learning/analytics run here. |

Transitions not listed are idempotent — an unknown (action, phase) pair returns state unchanged. Advancement is **manual only**: no auto-advance, no between-hole feedback, no live dashboard.

- **Aliases to avoid:** never `inProgress`, `active`, `finished`, `done`, or `idle` for these phases. Use the five exact names.

### Enumerated input/output vocabularies (`src/core/enums.ts`, `src/core/shot.ts`)

These closed enums are the controlled vocabulary for shot logging and recommendation. Do not invent members.

| Enum | Members |
| --- | --- |
| `ShotKind` | `tee`, `approach` |
| `Elevation` | `up`, `flat`, `down` |
| `Lie` | `tee`, `fairway`, `rough`, `sand` |
| `PinLocation` | `front`, `middle`, `back`, `left`, `right` |
| `Confidence` | `low`, `medium`, `high` |
| `AggressionLevel` | `conservative`, `neutral`, `aggressive` |
| `ShotShape` | `draw`, `straight`, `fade` |
| `StartDirection` | `left`, `onLine`, `right` |
| `Curve` | `hook`, `straight`, `fade`, `slice` |
| `Contact` | `thin`, `fat`, `center`, `toe`, `heel` |
| `DistanceResult` | `short`, `pinHigh`, `long` |
| `Quality` | `good`, `neutral`, `poor` |
| `MissPattern` (engine) | `left`, `right`, `short`, `long`, `none` |
| `Hazard.type` (engine) | `ob`, `water`, `penalty`, `bunker` |
| `Hazard.side` (engine) | `left`, `right` |

- **Note on overloaded words:** `fade` is a member of **both** `ShotShape` and `Curve`, and `left`/`right`/`short`/`long` recur across enums. Always qualify by enum in prose (e.g. "`Curve` = `fade`", not just "fade"). `ShotShape` has no `hook`/`slice`; `Curve` does — they are different vocabularies (intended shape vs. observed result).

---

## 4. External Boundaries

There is exactly one external service: **Convex**. (No Clerk, no identity provider, no third-party auth. If a task mentions those, it does not apply to this codebase — flag it.)

### The sync seam

| Term | Meaning |
| --- | --- |
| **Local (source of truth)** | On-device op-sqlite (WAL), accessed only through repository interfaces in `src/data`. The app is fully functional against local alone. |
| **Remote (additive backup)** | Convex deployment (`convex/`), mirroring the seven core tables. Removable without breaking play. |
| `SyncClient` | The seam interface: `upsertFromClient(records)`, `pullSince(since)`. Decouples `src/sync` from the concrete Convex client. |
| `SyncRecord` | Transport envelope: a `{ table, doc }` discriminated union over the seven `SYNC_TABLES` (`src/core/sync.ts`). |
| `SYNC_TABLES` | The canonical sync set: `playerProfile`, `clubBaseline`, `course`, `hole`, `courseIntelligence`, `round`, `shot`. |
| `lastSync` / watermark | Epoch-ms high-water mark of the last successful reconcile. `0` = sync everything. |
| **Last-write-wins (LWW)** | The only conflict rule. Higher `updatedAt` wins. Single user, no CRDTs. |

**Boundary invariants:**
- Nothing on the play path (recommendation, logging, hole nav, resume) may have a hard network dependency.
- `src/core`, `src/engine`, `src/data`, `src/session` never import Convex or React. Only `src/sync` and `convex/` know Convex exists.

- **Aliases to avoid:** never `User`/`Account`/`Session` in an auth sense (none exist), never `cloud`/`server` as the canonical term for the remote (use "Convex" or "remote backup"), never `merge`/`resolve` as the conflict rule name (it is "last-write-wins").

---

## 5. Resolved terminology decisions

These four terms were ambiguous on first read and are now pinned against the code. Do not re-blur them.

### The three "tendency / miss" concepts are independent — none derives from another
- `ClubBaseline.tendency` (`entities.ts:87`) — a **free-form per-club string note** (e.g. `"pull-prone under pressure"`). Human annotation. Not machine-parsed.
- `PlayerProfile.missTendencies` (`entities.ts:39`) — a **player-level `Record<string, string>`**. Marked provisional ("tighten as the engine consumes them"); **the engine does not read it today.** `SessionState.profile` is held "for completeness; the cue derives miss from live logs, not the profile" (`state.ts:52`).
- `MissPattern` (`engine/cue.ts`) — a **closed enum** `left | right | short | long | none`, **derived live** from the current round's `ShotLog[]` and consumed only by `selectMentalCue`.
- **Rule:** the runtime miss signal is `MissPattern`, computed from live logs. `tendency` and `missTendencies` are stored notes, not inputs to the current engine. Wiring `missTendencies` into the engine is future work; until then, do not describe it as influencing recommendations.

### Aggression is round-default with an optional per-shot override
- `Round.aggressionDefault` (`entities.ts:122`) sets the round-level default (an `AggressionLevel`).
- `ShotInputBase.aggression?` (`state.ts:29`) is optional and **"Overrides the round default when set."** Carried on `currentShot` via `SET_SHOT_CONTEXT`.
- **Rule:** the engine always receives one resolved `AggressionLevel` = `currentShot.aggression ?? round.aggressionDefault`. `AggressionLevel` is the enum; `aggressionDefault` is the round field; per-shot override is the optional `currentShot.aggression`.

### Neither `HoleGeometry` nor `greenIntel` feeds the approach engine — `GreenContext` does
- `recommendApproach` consumes only `GreenContext { falseFront?: boolean }` (`engine/approach.ts:18`), supplied per shot on `ApproachShotInput.green` (`state.ts:43`).
- `Hole.geometry` (`HoleGeometry`, passthrough JSON) and `CourseIntelligenceMemory.greenIntel` (a string) are **human-readable reference data**, not engine inputs. Both are intentionally loose — SPEC §12 still lists structured green geometry as an open blocking question.
- **Rule:** whatever populates `GreenContext` at the session/UI boundary is authoritative for targeting. `HoleGeometry` (static, per-hole) and `greenIntel` (learned, per-hole memory) are notes a human reads; they do **not** currently drive `recommendApproach`. Do not claim the engine reads green geometry.

### `detectLearning` / `LearningSuggestion` do not exist yet
- No such symbols in `src/engine` on this branch. They are SPEC §7 / P1-1 concepts only. See the corrected row in §2. Treat as planned vocabulary, not callable code.

---

## Maintenance notes

- This document mirrors code as of the current `phase-d-session` branch state (through Phase F setup). When an entity, enum member, action name, or state is added or renamed, update the matching section in the same change.
- §5 pins terms that were previously ambiguous. If code later wires `missTendencies` into the engine, gives `greenIntel`/`HoleGeometry` a real consumer, or implements `detectLearning`, move the affected entry out of §5 and update §2 accordingly.
