# Handoff: AI Caddie shot flow

## Overview

A redesign of the in-round shot flow for `IslandTeki18/ai-caddie` (Expo / React Native / NativeWind / expo-router). The flow stays four screens — hole start → shot context → the recommendation → log — but the recommendation screen is rebuilt to lead with one confident call and show the evidence behind it: the itemized plays-like math unfolded by default, the player's own TrackMan carry, and the miss pattern from the round in progress.

Also included: a pixel recreation of all nine current screens as they exist on `main`, for before/after comparison.

## About the design files

`AI Caddie.dc.html` is a **design reference created in HTML** — a static prototype showing intended look and layout, not production code to copy. Implement it in the existing Expo / React Native codebase using the established patterns: NativeWind classes with the tokens in `tailwind.config.js`, the shared primitives in `src/ui/components.tsx`, expo-router screens under `app/`. Do not port the HTML.

Open the file in a browser to view it. It is a canvas of phone frames: turn 2 (top) is the new direction, turn 1 (below) is the recreation of today's app.

## Fidelity

**High-fidelity.** Colors, type sizes, spacing and copy are final and taken from the repo's own tokens. Recreate them exactly using existing components where they fit.

## Screens

### 2a — Hole start (replaces `app/hole.tsx`)

Vertical stack, screen padding 20px horizontal.

- **Header row**: eyebrow "HOLE" (12px / 600 / 0.14em / uppercase / `fg-muted`) beside the hole number at 44px / 800 / `fg`. Right side: the existing live pill (`accent-soft` bg, 7px `accent` dot, 11px uppercase `accent` label).
- **Hole strip**: horizontal scroll of 44×44 chips, radius 12, gap 8. Inactive `surface` bg + `line` border + `fg-muted`; active `accent` bg + `accent-ink` 700. Same as today; keep the active chip scrolled into view.
- **Stat row**: three equal cards, radius 16, `surface` + `line`, padding 12/14. Label 11px uppercase `fg-muted`; value 26px / 800 (`accent` for Par, `fg` otherwise). Par / Yards / Index.
- **"What you know about 7"** card: radius 16, padding 16/18. Label 11px uppercase `fg-muted`; body 15px / 1.45 `fg` with `text-wrap: pretty`. Below it a wrapping row of 12px `fg-muted` pills on `surface-2`, radius 999, padding 5/10 — historical facts for the hole (club used recently, scoring average).
- **Pin** and **Aggression**: existing `Segmented`, min-height 44. Aggression is a three-up equal-width row rather than wrapping chips.
- **Footer** (pinned to bottom, 26px bottom padding): two side-by-side buttons, min-height 56, radius 16 — "Tee shot" filled `accent` / `accent-ink` 800, "Approach" outlined `surface` + `line` + `fg` 700. Below, the "Finish round & review →" link, 14px `accent`, centered.

### 2b — Shot context (replaces `app/shot.tsx`)

Everything on one screen, every field pre-set to the player's usual answer so a typical shot is 0–2 taps.

- **Back row**: `‹` in `accent` at 22px + "HOLE 7 · APPROACH" eyebrow.
- **Yardage stepper**: centered. Label "YARDAGE TO PIN" 11px uppercase. Value 76px / 800 / -0.03em `fg`, flanked by 58px circular −/+ buttons (`surface` + `line`, 26px glyph). Caption 13px `fg-dim`: "laser or tap ±1 · hold for ±5". Hold-repeat on the steppers.
- **Lie / Elevation / Confidence**: three full-width rows of equal-flex chips, min-height 52, radius 14, gap 8. Label above each, 13px / 600 `fg-muted`.
- **"Reading now" card**: radius 16, `surface` + `line`, padding 14/16. Left: label 11px uppercase + summary 15px `fg` ("Pin middle · false front off · neutral"). Right: "Edit" 14px / 600 `accent`. This collapses the less-touched fields carried in from the hole screen.
- **Footer**: caption 13px `fg-dim` centered — "Every field already has your usual answer. Change what's different." — over a min-height 60, radius 18 `accent` button, "Get the call", 18px / 800.

### 2c — The call (replaces `app/recommendation.tsx`) — the core screen

Five blocks, 12px gaps, 20px horizontal margins. Must fit 844px without scrolling.

1. **Hit card**: full-bleed `accent` panel, radius 22, padding 16/20/15, all text `accent-ink`.
   - "HIT" 11px / 800 / 0.16em uppercase at 62% opacity.
   - Club: **52px / 800 / -0.035em** — "7 iron".
   - Line under: 16px / 700 — "at the middle-left of the green, stock fade" (target + shape merged into one sentence).
   - Two inset tiles, gap 10, `rgba(11,20,8,.12)` bg, radius 12, padding 9/12: "BEST MISS" and "DO NOT", label 10px / 800 uppercase at 60%, value 16px / 700.
2. **Plays like card**: `surface` + `line`, radius 18, padding 14/18. Header row: "PLAYS LIKE" 11px / 700 uppercase `fg-muted` opposite the total at 30px / 800 `fg`. Then the five signed terms at 14px, labels `fg-muted`, values `fg`, tabular-nums, gap 5 — each label carries its cause ("Wind · 8 mph in, off the left", "Temp · 78°F", "Elevation · downhill"). Total row is separated by a 1px `line` rule, 700, value in `accent`. **Always expanded** — no disclosure.
3. **Why the 7 card**: label 11px uppercase; body 13px / 1.5 `fg-muted` with the carry number emphasized in `fg` 600 — "Your 7i carries **168 average, ±6 lateral** over 42 TrackMan shots. The 6 brings the back bunker in." Below a `line` rule: a row of four 24px result chips (last four shots: `surface-2` bg / `fg-muted`, most recent `#2A332C` / `fg`) beside 13px `fg-muted` text — "Three of four right today — target moved left to absorb it."
4. **Cue band**: `accent-soft` bg, radius 18, padding 13/18. "CUE" 11px / 700 uppercase `accent` at 80%; cue text 20px / 700 `fg`.
5. **Footer**: min-height 58, radius 18, `accent` button, "Log result", 18px / 800.

### 2d — Log (replaces `app/log.tsx`)

Same five dimensions as `ShotLogGrid`, laid out as five full-width equal-flex rows (min-height 52, radius 14) instead of wrapping chips, so each row is one thumb sweep. Header: eyebrow "LOG · HOLE 7 · 7 IRON" + 32px / 800 "What happened?". After the rows, a 13px `fg-muted` note card reflecting the log back — "That's a fourth right start today. The next call will bias further left." Footer: "Log shot" `accent` button (flex 1) beside an outlined "Hole done", both min-height 60, radius 18.

### 2e — Review (merges `app/review.tsx` and `app/learning.tsx`)

- **Summary card**: one 15px / 1.5 sentence with counts and the two dominant tendencies emphasized in `accent` 700, then the two existing bar groups (tee miss, approach distance). Bars: 8px tall, radius 999, track `surface-2`, fill `accent`; label column 66px, count column 20px right-aligned, 14px `fg-muted`.
- **Clubs card**: label 11px uppercase, then rows of "Club · kind (n)" `fg-muted` opposite "NN% good" `fg`, 15px, gap 8.
- **Learning card inline**: hole eyebrow, 17px / 700 title, 14px / 1.5 rationale, then "Remember it" (`accent`, flex 1, min-height 50, radius 14) beside "Discard" (outlined `line`, `fg-muted`). Learning suggestions surface in the review stream rather than on a separate screen.
- **Footer**: 13px `fg-dim` — "2 more suggestions · nothing changes without your say".

## Interactions & behavior

- Navigation is unchanged: `hole → shot → recommendation → log → hole`. 2e is reached from "Finish round & review".
- **Yardage stepper**: tap = ±1, press-and-hold = ±5 repeating (~120ms interval after a 400ms delay). Haptic light impact per step.
- **Chips**: all keep the existing 44pt minimum target; 2b/2d raise it to 52. Pressed state is the existing `opacity: 0.85`.
- **Plays-like**: no expand/collapse state remains — delete the `expanded` state from the recommendation screen. Each term's label string is composed from the round conditions that produced it, so an unknown condition renders the bare label.
- **Miss-pattern row**: reads the last four logged shots of the round via `startDirection`; the sentence is generated from the dominant direction and only rendered when a dominant direction exists (reuse `analyzeRound` / the live miss pattern already feeding `selectMentalCue`).
- **"Why the 7"** copy pulls the chosen club's baseline carry and shot count from `ClubBaseline` / the TrackMan import, plus the dispersion figure from `src/engine/dispersion.ts`. When a club has no baseline, drop the sentence rather than showing a placeholder.
- **Log reflection note**: rendered only when the just-logged shot continues a pattern of three or more.
- Nothing on 2e persists without an explicit "Remember it" — unchanged from `applyApprovedUpdate`.

## State

No new stores. The screens read what already exists:

- `useSessionContext()` — `state.round`, `state.holeNumber`, `state.baselines`, `dispatch`.
- `currentRecommendation(state)` / `currentPlaysLike(state)` for 2c. The plays-like labels need the raw conditions (wind mph and direction, temp, elevation) alongside the signed terms — either extend `PlaysLikeBreakdown` with an optional `reasons` record or pass round conditions into the screen and format there.
- Recent shots for the miss-pattern row: `repos.rounds.listShots(roundId)`, last four.
- 2e additionally needs `suggestLearning(shots, holeIdByNumber)` inline, as `app/learning.tsx` does today.

## Design tokens

From `tailwind.config.js` — do not introduce new colors.

| Token | Hex |
| --- | --- |
| ink | `#0F1511` |
| surface | `#171E19` |
| surface-2 | `#1F2822` |
| line | `#2A332C` |
| fg | `#F2F5F2` |
| fg-muted | `#9AA69E` |
| fg-dim | `#5E675F` |
| accent | `#8DF06B` |
| accent-ink | `#0B1408` |
| accent-soft | `#1E2A18` |

Radii: 12 (chips), 14 (large chips), 16–18 (cards, buttons), 22 (hit card), 999 (pills, bars).
Spacing: 20px screen gutter, 12–16px between cards, 8px between chips.
Type: system font. 11/12px uppercase labels (0.1–0.16em tracking), 13–15px body, 16–17px emphasis, 20–21px cue, 26–32px headings, 44–76px hero numerals. Weights 500 / 600 / 700 / 800.
Tap targets: 44pt minimum, 52–60 for in-round controls.

## Assets

None. No icons or images are used — the only glyphs are `‹`, `›` and `→`, as in the current code.

## Files

- `AI Caddie.dc.html` — the design canvas. Turn 2 (`2a`–`2e`) is the new direction; turn 1 (`1a`–`1i`) is the recreation of the current app.
- `support.js` — runtime needed to open the HTML locally. Not part of the handoff scope.

Source screens this replaces: `app/hole.tsx`, `app/shot.tsx`, `app/recommendation.tsx`, `app/log.tsx`, `app/review.tsx`, `app/learning.tsx`, with shared primitives in `src/ui/components.tsx` and `src/ui/shot-log-grid.tsx`.
