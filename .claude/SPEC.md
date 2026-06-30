# AI Caddie — Product & Technical Specification

**Version:** 2.0
**Status:** Draft for build
**Platform:** Standalone React Native (Expo) iOS app, local-first with Convex sync
**Companion document:** `BLUEPRINT.md` (build plan and step sequence)

---

## 1. Problem Statement

A competitive senior golfer loses strokes not from a lack of skill but from course-management errors, flag-hunting into bad spots, and mental lapses over the ball. Existing GPS and rangefinder apps tell him *how far* — they don't tell him *where to aim, what shape to play, where to miss,* or *what to commit to.* This app is a personal AI caddie for one player: it converts his own TrackMan data, tendencies, and live round signals into a single, confident recommendation per shot, so he makes fewer big mistakes and scores lower.

This is a personal product — a gift, built for and tuned to one specific golfer — not a market product. Every design decision optimizes for *his* trust and *his* scoring, not for general appeal.

---

## 2. Goals

1. **Lower scoring through fewer big mistakes** — bias every recommendation toward avoiding the score-wrecking miss (penalty, short-side, false-front rejection) rather than chasing the hero shot.
2. **One confident decision per shot** — output a single, unambiguous recommendation (club, target, shape, best miss, do-not, mental cue), never a menu of options to deliberate over.
3. **Total trust through transparency** — the player can see exactly why a number "plays like" what it does, so he believes the recommendation enough to commit.
4. **Frictionless in-round use** — full interaction per shot in 5–10 seconds, shot logging in 1–3 seconds, so the app never slows down play or breaks his rhythm.
5. **Works everywhere he plays** — fully functional with zero signal for an entire round; the network is never on the critical path.
6. **Gets smarter over time** — learns each course and his tendencies across rounds, but never changes strategy without his approval.

---

## 3. Non-Goals

1. **Not a GPS/rangefinder.** Yardage to the pin is a manual input (or future integration), not a mapping feature. Out of scope: GPS distance, hole maps, shot tracking by location.
2. **Not a full-bag shot tracker.** V1 covers tee shots and approach shots only — no putting, chipping, bunker, or recovery logging. Those add input friction without serving the core scoring lever.
3. **Not a multi-user or social product.** No accounts beyond the single player, no sharing, no leaderboards, no coaching marketplace. Single-user assumptions are baked into the sync model deliberately.
4. **Not a live-feedback coach during the round.** No live stat dashboard, no between-hole grading. Feedback is post-round only, to protect the player's mental state mid-round.
5. **Not an Apple Watch app (V1).** A glanceable wrist companion is compelling but native-only and out of Expo's reach; explicitly deferred, not designed out.

---

## 4. Target User

**The Player (primary and only in-round user).** A competitive senior golfer with established mechanics, a known stock driver shape (fade), and TrackMan baseline data. Plays the same handful of courses repeatedly. Values decisiveness and trusts data. Will abandon any tool that is slow, fiddly, or second-guesses him over the ball.

**The Builder (Landon).** Configures baselines, seeds course intelligence, and maintains the app. Some setup tasks (TrackMan import, initial course data) are builder tasks, not in-round player tasks.

---

## 5. User Stories

**Pre-round**
- As the player, I want my course, weather, and aggression pre-set so I can start a round in seconds.
- As the player, I want all pre-round inputs to be optional so I'm never blocked from starting.

**Tee shots**
- As the player, I want a single tee recommendation that keeps the driver unless the right side genuinely threatens my dispersion, so I stay aggressive without courting disaster.
- As the player, I want to see the recommended shape, target, and best miss so I can commit to a clear picture.

**Approach shots**
- As the player, I want approaches aimed at the *functional* center of the green — adjusted for the pin, slopes, and false fronts — so I stop short-siding myself and three-putting.
- As the player, I want the yardage to show its full "plays like" math so I trust the club selection.

**Logging**
- As the player, I want to log a shot's result in one to three seconds using only buttons so logging never slows my round.

**Learning & review**
- As the player, I want the app to suggest course-specific lessons after a round and let me approve or reject each one, so it never quietly changes strategy on me.
- As the player, I want a post-round review of my misses, decisions, and trends so I learn between rounds, not during them.

**Offline**
- As the player, I want the entire round — recommendations, logging, resume — to work with no signal, so a dead zone on the back nine never breaks the app.

---

## 6. Requirements

### 6.1 Must-Have (P0)

**P0-1 — Per-shot recommendation output.** Every tee or approach recommendation displays exactly six fields: Club, Target, Shape, Best Miss, Do-Not, and one dynamic Mental Cue.
- *Given* a tee or approach context, *when* the player requests a recommendation, *then* all six fields render in the spec's format (e.g. Club: 7i / Target: functional center-left / Shape: soft fade / Best Miss: short-right / Don't: long-left / Cue: commit to the picture).

**P0-2 — Transparent yardage model.** Approach yardage is shown as an itemized breakdown that sums to a "plays like" total.
- [ ] Displays base, wind, temperature, elevation, and strike-trend adjustments as separate signed terms.
- [ ] The terms sum to the displayed "plays like" number.
- [ ] Adjustments incorporate lie and confidence.

**P0-3 — Tee strategy: driver-unless-right-side-risk.** Default keeps driver on a fixed stock-fade model; downgrades only when right-side OB, water, or penalty area overlaps expected dispersion.
- *Given* a clean hole, *then* driver is kept. *Given* right-side water inside dispersion, *then* driver is downgraded. *Given* a left-side hazard only, *then* driver is **not** downgraded.

**P0-4 — Approach strategy: functional center.** Approaches target the functional center of the green, never the flag by default, adjusting for pin, green slope/shelves/false fronts, best leave zone, club tendencies, current-round miss pattern, conditions, and confidence.

**P0-5 — Dynamic dispersion with moderate adaptation.** Dispersion starts from TrackMan baseline and adapts to current-round shot signals at moderate strength, with a cap so a single shot cannot dominate.
- [ ] One bad shot shifts dispersion slightly. [ ] A consistent pattern shifts it more. [ ] No single shot exceeds the cap.

**P0-6 — Button-only shot logging.** A single shared screen logs tee and approach results via buttons only: Start Direction, Curve, Contact, Distance, Quality.
- [ ] A complete log takes ≤5 taps and 1–3 seconds. [ ] Same screen for both shot kinds.

**P0-7 — Fully offline round.** Recommendations, logging, hole navigation, and mid-round resume all function with no network for an entire round.
- [ ] No recommendation or log action has a hard network dependency. [ ] A force-quit mid-round resumes at the exact hole and shot on relaunch.

**P0-8 — Manual hole flow.** Round advances only via explicit "Next Hole." No automatic advancement, no between-hole feedback, no live dashboard.

**P0-9 — Local-first persistence.** On-device SQLite is the source of truth; all round data survives app-kill and relaunch without the network.

### 6.2 Nice-to-Have (P1)

**P1-1 — Course learning with approval.** After a round, the app surfaces suggested per-hole updates (preferred tee club, safe-miss zones, poorly-performing clubs, leave zones, condition notes) as approve/reject cards. Nothing changes strategy automatically.

**P1-2 — Post-round analytics.** Miss patterns, club performance, tee and approach decision quality, green-targeting effectiveness, conservative-vs-aggressive outcomes, and hole-by-hole learning suggestions.

**P1-3 — Convex sync.** Local data mirrors to Convex when online for backup and cross-device, using last-write-wins. Sync degrades gracefully and is never required for play.

**P1-4 — Player profile management.** View/edit club yardages, TrackMan baselines, miss tendencies, and confidence modifiers.

### 6.3 Future Considerations (P2)

**P2-1 — Apple Watch companion** for glanceable club/target over the ball (native target, separate from the Expo app).
**P2-2 — Long-term, cross-course trend analytics** and scoring-trend tracking.
**P2-3 — Short game and putting** logging and recommendations.
**P2-4 — GPS / rangefinder integration** to auto-fill approach yardage.
**P2-5 — Web dashboard** (Convex-backed) for off-course review.

These are explicitly out of V1 scope but the architecture must not foreclose them — hence the repository seam, stable record IDs, and Convex schema mirror.

---

## 7. Decision Engine Behavior (detailed)

The engine is a pure module: value-types in, `Recommendation` out, no UI or storage dependencies. Its behavior is the heart of the product.

**Yardage model.** `playsLike(base, wind, temp, elevation, strikeTrend, lie, confidence)` → an itemized breakdown summing to a total. Every term is independently inspectable. Worked spec example: Base 150 + Wind 6 + Temp 2 − Elevation 3 + Strike 4 = Plays like 159.

**Dispersion model.** Baseline directional dispersion per club from TrackMan, adjusted by current-round start direction, curve, contact, and distance result at **moderate** strength. An explicit per-shot cap prevents overreaction. Adaptation may shift the target, adjust the best miss, or slightly modify club choice — but never lurch on one swing.

**Tee strategy.** Assumes a fixed stock fade off the established driver model. Keeps driver by default. Downgrades only when right-side OB/water/penalty overlaps the expected dispersion ellipse. Left-side hazards do not trigger a downgrade (the fade works away from them).

**Approach strategy.** Targets functional center, defined as the safest scoring zone given pin position, green geometry (slope, shelves, false fronts), best leave zone, the player's club tendencies, the live miss pattern, conditions, and confidence. Lower confidence widens the safety margin. Tucked pins still yield a center-biased target; false fronts push the target deeper.

**Mental cue selection.** One dynamic cue chosen from confidence, current miss pattern, and aggression — deterministic for a given input so the same situation yields a stable cue.

**Recommendation assembly.** Composes yardage → dispersion → tee/approach → cue into a single `Recommendation`. This is the only object the UI consumes for a shot.

**Course learning.** `detectLearning` scans accumulated shots and rounds for per-hole patterns above a confidence threshold and emits suggested updates. It never writes strategy directly — suggestions require player approval.

---

## 8. Data Model

Core entities, each with a stable `id` and `updatedAt` (for sync):

- **PlayerProfile** — the single player; confidence modifiers, miss tendencies.
- **ClubBaseline** — per-club TrackMan distance, dispersion, tendency.
- **Course** — a played course.
- **Hole** — per-hole record within a course.
- **CourseIntelligence** — learned per-hole memory: preferred tee club, typical target line, safe-miss zones, green intelligence, leave zones, tier/shelf behavior, poorly-performing clubs, condition notes.
- **Round** — a single round; weather, aggression default, course reference.
- **Shot** — a logged tee or approach: start direction, curve, contact, distance result, quality, timestamp, shot kind.

Relationships: Course → Holes; Round → Shots; CourseIntelligence keyed per Hole.

---

## 9. Architecture

**Local-first, single standalone Expo app.** Layers are folders under `src/`, with import direction enforced by an ESLint boundary rule:

1. `src/core` — types, enums, units, zod schemas (the shared contract).
2. `src/engine` — pure decision logic; imports core only.
3. `src/data` — op-sqlite + Drizzle schema and repository interfaces (the swap seam).
4. `src/sync` — Convex client and local↔cloud reconciliation.
5. `src/session` — round state machine; imports engine + data.
6. `app/` — expo-router screens.
7. `convex/` — schema, mutations, queries mirroring core types.

**Persistence.** On-device op-sqlite (WAL enabled) is the source of truth. The session reads and writes only through local repositories, so correctness and durability never depend on the network.

**Sync.** Convex is additive — backup, cross-device, future web. Reconciliation is last-write-wins by `updatedAt`, appropriate because there is exactly one user. If sync is offline or removed, the app still works completely.

**Why pure layers matter.** The hardest requirements (transparent yardage, capped adaptation, functional-center targeting, full offline) all live in layers that never touch Convex or React, so they are unit-testable in milliseconds and trustworthy before any screen exists.

---

## 10. In-Round UX Rules

- iOS-first, clean modern UI; buttons, sliders, radio buttons.
- Fully functional offline.
- No live stat dashboard during the round.
- No between-hole feedback.
- Manual "Next Hole" flow.
- Full interaction per shot target: 5–10 seconds.
- Shot logging target: 1–3 seconds, ≤5 taps, button-only.
- Pre-round and per-hole inputs pre-filled and editable; all pre-round inputs optional.

---

## 11. Success Metrics

This is a personal tool, so metrics center on *trust, friction, and scoring* rather than adoption or revenue.

**Leading (per round / few rounds):**
- **Logging speed** — median shot log completed in ≤3 seconds.
- **Interaction speed** — per-shot recommendation flow in ≤10 seconds.
- **Coverage** — % of tee and approach shots actually logged per round trends toward complete.
- **Round completion** — % of rounds where the app is used start to finish without being abandoned mid-round.
- **Offline reliability** — zero round-breaking failures in no-signal conditions.

**Lagging (over a season):**
- **Scoring trend** — downward trend in scoring average, especially fewer doubles/penalties.
- **Miss-quality trend** — fewer short-sided and penalty misses on approaches and tee shots.
- **Trust** — the player follows recommendations and reports believing them (the real test of a caddie).

---

## 12. Open Questions

**Blocking (resolve before the relevant build step):**
- **[data] TrackMan export format.** What exact format is the baseline data in (CSV, PDF, screenshots)? The importer (blueprint step 6) must target the real shape. *Needed before persistence import.*
- **[design/engine] Green geometry input.** The approach engine needs structured green data (slope, shelves, false fronts, leave zones), but the inputs currently describe only "green reading images" and freeform notes. How is structured green geometry captured and stored? This is the largest gap between the input model and what the approach logic requires. *Needed before approach logic.*
- **[engine] Wind representation.** Recommendations need wind direction *and* speed relative to the shot, but inputs list only "wind." How is direction captured and applied per shot? *Needed before the yardage/dispersion models are tuned.*

**Non-blocking (tune during implementation):**
- **[engine] Stock-fade driver model values** and the magnitude of the right-side-risk downgrade threshold.
- **[engine] Functional-center adjustment weights** — how far a false front pushes the target, how much low confidence widens the margin. Best tuned against the player's real logged misses once logging works.
- **[product] Round length.** Fixed 18 holes, or variable (9, 18, partial)?
- **[product] Confidence input granularity** — scale, default, and how strongly it should move recommendations.

---

## 13. Phasing

Build phasing follows the companion blueprint's 16 chunks / 30 steps. Spec-level milestones:

1. **Engine-trustworthy (P0 core).** Core types, local persistence, and the full decision engine — yardage, dispersion, tee, approach, cue, assembler — proven by tests with no UI. The brain is correct before anything is drawn.
2. **Playable offline round (P0 complete).** Round session, setup and per-hole UI, recommendation card, and button logging — a full offline round, start to finish, with mid-round resume.
3. **Smarter and synced (P1).** Convex sync, course learning with approval, post-round analytics.
4. **Hardening.** Crash-safe resume, offline/sync edge cases, accessibility.

A hard milestone worth naming: the app should be trustworthy enough for the player's first real round only after Milestone 2, with at least one course's intelligence seeded.

---

## 14. Acceptance Criteria (V1 ship)

- [ ] A full 18-hole round can be played start to finish in airplane mode: every tee and approach produces a six-field recommendation, every shot logs in ≤3 seconds, and the round resumes exactly after a force-quit.
- [ ] Approach yardage always shows an itemized breakdown that sums to the displayed "plays like" total.
- [ ] Driver is kept by default and downgraded only for right-side penalty risk; left-side hazards never force a downgrade.
- [ ] Approaches target functional center, never the flag by default; false fronts push targets deeper; low confidence widens margins.
- [ ] A single bad shot never swings the next recommendation beyond the adaptation cap.
- [ ] Course-learning suggestions appear only as approve/reject cards; no strategy changes without approval.
- [ ] With the network restored, local data syncs to Convex and back with last-write-wins, and nothing about play depended on it.