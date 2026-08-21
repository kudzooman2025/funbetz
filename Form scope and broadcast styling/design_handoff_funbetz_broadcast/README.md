# Handoff: FunBetz broadcast-scoreboard redesign

## Overview

A redesign of the FunBetz core loop — Games (picking) → Parlay ticket → League board → Standings — in a retro-modern broadcast-scoreboard direction, plus a live lock countdown that does not exist in the app today. Two close variants are included; **pick one before implementing** (see "Variants" below). Everything else in this document is shared by both.

Target repo: `kudzooman2025/funbetz` (Next.js App Router, Tailwind v4, dark only, mobile-first).

## About the design files

The `.dc.html` files in this bundle are **design references created in HTML** — working prototypes that show the intended look and behavior. They are not production code to copy. The task is to recreate them in the existing Next.js + Tailwind v4 codebase using its established patterns: React/TSX client components, Tailwind utility classes, `@theme` tokens in `app/globals.css`, the existing zustand `useTicketStore`, and the existing `/api/games`, `/api/parlays`, `/api/wallet` endpoints. The prototypes use hard-coded NFL preseason Week 2 sample data; real data comes from the existing API shapes (`GameResponse` in `lib/types.ts`).

Open the files directly in a browser to interact with them.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and interactions are final. Recreate pixel-for-pixel using Tailwind utilities. Every value in this document is exact.

## Variants

| | 1a "Scoreboard" | 1b "Stub" |
| --- | --- | --- |
| File | `FunBetzScoreboard.dc.html` | `FunBetzStub.dc.html` |
| Pick surface | Vertical away-over-home rows, full-width, 46px min height each | Side-by-side slabs (keeps today's layout), 52px min height, abbreviation-led |
| Primary accent | Lime `#B4F03C` | Amber `#FFC53D` (lime reserved for wins) |
| Countdown | Three split HH/MM/SS slab boxes | One 26px mono clock + window-progress rule |
| Extra chrome | Live results ticker strip under the countdown | No ticker; window-progress bar instead |
| Ticket | Dark card, LED payout panel | Cream paper stub `#F4F1E8` with punched notches |
| Tab labels | Games / Ticket / Leagues / Ranks | Games / Stub / Leagues / Ranks |

Both keep the existing component anatomy — GameRow, locked GameRow variant, week header, floating ticket bar, parlay ticket, status treatment, league card — so either ports one component at a time.

## Design tokens

Replace the current `@theme` block in `app/globals.css`. The palette shifts from deep navy to cool graphite; the green shifts from `#00C853` to a brighter lime that survives on graphite.

```css
@theme {
  --color-brand-dark:    #101315;  /* page background */
  --color-brand-black:   #0B0E0F;  /* nav bars, inset wells, ticker */
  --color-brand-card:    #171B1E;  /* card surface */
  --color-brand-raised:  #14181B;  /* card headers, sub-bars */
  --color-brand-surface: #20262A;  /* buttons, badges, inputs */
  --color-brand-border:  #232A2E;  /* hairlines */
  --color-brand-line:    #2C3439;  /* button borders, dividers */
  --color-brand-muted:   #8A979E;  /* secondary text */
  --color-brand-dim:     #6E7C82;  /* tertiary text, inactive tabs */
  --color-brand-faint:   #4F5A5F;  /* locked/disabled text */
  --color-brand-green:   #B4F03C;  /* picks, wins, primary action (1a) */
  --color-brand-gold:    #FFC53D;  /* payouts, multiplier, primary action (1b) */
  --color-brand-loss:    #FF6B5E;  /* lost legs */
}
```

Body text `#EDF1F2`; secondary body `#C7D0D4`. Dark only — no light theme.

Keep the existing thin dark scrollbar rules and `input:focus` treatment in `globals.css`; update the focus ring color to `--color-brand-green`.

### Typography

Three families, loaded via `next/font/google`:

- **Barlow Condensed** (500/600/700) — all display, headings, team names, labels, buttons, tab labels. Always `text-transform: uppercase` with positive letter-spacing.
- **IBM Plex Mono** (500/600) — all numerals: countdown, wallet, stake, payout, multiplier, ranks, betz totals, dates, ticket numbers.
- **IBM Plex Sans** (400/500/600) — body copy, usernames, descriptive lines.

JetBrains Mono is replaced by IBM Plex Mono. Do not use the default sans stack anywhere.

Type scale as used (font, size / letter-spacing / weight):

| Role | Spec |
| --- | --- |
| Wordmark | Barlow Condensed 24px / .04em (1a) or .1em (1b) / 700 |
| Screen title | Barlow Condensed 26–27px / .03–.05em / 700 |
| Week header | Barlow Condensed 18–19px / .04–.06em / 700 |
| Team name (1a row) | Barlow Condensed 18px / .03em / 600 |
| Team abbrev (1b slab) | Barlow Condensed 21px / .04em / 700 |
| Team full name (1b slab) | IBM Plex Sans 11px / 400 |
| Button label | Barlow Condensed 17–21px / .1–.14em / 700 |
| Small caps label | Barlow Condensed 11–14px / .1–.2em / 500–600 |
| Countdown digits | IBM Plex Mono 18px (1a slabs) / 26px (1b clock) / 600 |
| Payout figure | IBM Plex Mono 44px (1a) / 38px (1b) / 600 |
| Stake figure | IBM Plex Mono 26px / 600 |
| Ranks betz | IBM Plex Mono 14–15px / 600 |
| Mono meta line | IBM Plex Mono 10–11px / .04–.06em |
| Body copy | IBM Plex Sans 13px / 1.6 |

### Geometry

Radii are tighter than today's `rounded-lg`: cards `5px` (1a) / `4px` (1b), buttons and pills `3px`, chips in 1b `999px`, badges `50%`. Border width 1px throughout; selected rows in 1a use a 3px left border. Card shadows: none on cards; floating ticket bar in 1a uses `0 10px 30px rgba(0,0,0,.55)`; the paper stub uses `0 14px 34px rgba(0,0,0,.5)`.

Spacing: screen padding 14px horizontal; card padding 9–12px; gap between game cards 7–8px; content area gets `padding-bottom: 96px` to clear the bottom nav plus floating bar.

## Screens

### 1. Shell (all screens)

Vertical flex column, full height, `background: --color-brand-dark`, `overflow: hidden`.

**Header bar** — 12px/14px padding on `--color-brand-black` (1b) or `--color-brand-dark` with a 1px bottom hairline (1a).
- Left: wordmark. 1a: `FUN` in lime + `BETZ` in `#EDF1F2`. 1b: `FUN` in `#EDF1F2` + `BETZ` in amber.
- Right, 1a: wallet chip — 1px `--color-brand-line` border, `--color-brand-card` fill, 4px radius, mono 13px amber figure + Barlow 12px `.1em` uppercase "betz"; then a 28px circular avatar with initial.
- Right, 1b: mono line `BAL` in muted + 15px `#EDF1F2` figure.

**Lock countdown** — sticky directly under the header. This is new; it is the main urgency lever.
- 1a: `--color-brand-raised` bar, hairlines top and bottom. Left column: 6px lime dot pulsing (`opacity 1 → .45`, 1.6s ease-in-out infinite) + "PICKS LOCK" in lime Barlow 12px `.16em`, second line "Preseason Wk 2 · 6 games" in Barlow 13px `.08em` muted. Right: three boxes, each min-width 38px, `--color-brand-black` fill, 1px `--color-brand-line`, 3px radius, mono 18px digit (hours/minutes lime, seconds `#EDF1F2`) over a 9px `.14em` uppercase unit label.
- 1b: `--color-brand-raised` bar. Row one: 6px amber pulsing dot + "WINDOW CLOSES" amber Barlow 13px `.2em` on the left, `HH:MM:SS` mono 26px `#EDF1F2` on the right. Below: a 3px track `--color-brand-surface` with an amber fill showing elapsed share of the betting window (62% in the mock). Below that, an 11px `.14em` uppercase muted row: "Opened Mon 9:00 AM" / "Preseason Wk 2".

Countdown ticks every 1000ms from the real weekly lock timestamp; at zero the week's games become the locked variant.

**Ticker (1a only)** — 24px tall strip on `--color-brand-black` with a bottom hairline. Content duplicated twice inside a `width: max-content` flex row, animated `translateX(0 → -50%)` over 38s linear infinite. Mono 10px `.06em`, muted, with scores in `#EDF1F2`, league hits in lime, top parlay in amber.

**Bottom nav** — four tabs, `--color-brand-black`, 1px top hairline, each 56px min height, Barlow 14px `.14em` uppercase.
- 1a: active tab gets a 2px lime top border, `rgba(180,240,60,.07)` fill, lime label; inactive `#6E7C82`.
- 1b: label over an 18×2px amber underline bar; inactive label `#6E7C82`, transparent bar.

Desktop keeps the existing top navbar; the bottom nav stays `md:hidden`. The countdown bar should render on both breakpoints, directly under the navbar.

### 2. Games

Purpose: browse the full season, pick 3–8 winners inside the open window.

- **League chip strip** — horizontal scroll, 6px gap. 1a: 3px-radius rectangles; active = 1px lime border, `rgba(180,240,60,.14)` fill, lime label; inactive = `--color-brand-line` border, `--color-brand-card` fill, muted label. 1b: 999px pills, 32px min height; active = solid amber fill with `#0B0E0F` label; inactive = transparent with `--color-brand-line` border.
- **Week header** — the page must open on the first week with open games, not week 1. Title in Barlow 18–19px uppercase, an "N OPEN" pill (lime tint 1a / amber mono count 1b), and the date range right-aligned in mono 10px `#6E7C82`.
- **GameRow, 1a** — card `--color-brand-card`, 1px `--color-brand-border`, 5px radius, `overflow: hidden`. Header strip: `--color-brand-raised`, 7px/10px padding, bottom hairline, kickoff slot left in Barlow 13px `.12em` muted, network right in mono 10px `#6E7C82`. Body: two stacked pick buttons separated by a 1px `--color-brand-border` rule inset 10px. Each button min-height 46px, 8px/10px padding, 3px left border, 26px circular badge (`--color-brand-surface` fill, initial letter fallback), team name, and a 16px square indicator at the right.
  - Unselected: left border `--color-brand-border`, transparent fill, `#C7D0D4` text, hollow 1px `#3A4348` indicator; hover `background: #1C2226`.
  - Selected: left border lime, `rgba(180,240,60,.10)` fill, lime text, "PICKED" in Barlow 12px `.14em`, solid lime indicator, badge border `#3A4A2A`.
- **GameRow, 1b** — card `--color-brand-card`, 1px `--color-brand-border`, 4px radius, 9px/10px padding. Meta row: kickoff mono 10px muted left, network Barlow 11px `.16em` `#4F5A5F` right. Below: two slabs with a centered "AT" (Barlow 12px `.1em` `#4F5A5F`) between them, 7px gaps. Each slab min-height 52px, column layout: abbreviation Barlow 21px 700 over full team name IBM Plex Sans 11px.
  - Unselected: `--color-brand-raised` fill, 1px `--color-brand-line`, `#C7D0D4` / `#6E7C82`; hover border `#4F5A5F`.
  - Selected: 1px amber border, `rgba(255,197,61,.16)` fill, amber text.
- **Locked weeks** — collapsed below the open week, still browsable. 1a: 1px dashed `--color-brand-border` rows, `#131719` fill, matchup in Barlow 17px `#6E7C82`, short date mono 10px `#4F5A5F`, "OPENS FRI" label. 1b: plain rows separated by 1px `#1A1F22`, same muted treatment, header reading "opens Fri 9:00 AM". Both keep the existing `▾ Collapse` / `▸ Expand` behavior: weeks with open games expand by default.
- **Floating ticket bar** — appears when ≥1 pick, sits above the bottom nav.
  - 1a: inset 10px left/right, 64px from bottom, `--color-brand-raised` fill, 1px lime border, 5px radius, drop shadow. Title "N legs · Mx" Barlow 18px `.06em` lime; sub-line mono 10px muted showing either "need N more · min 3 legs" or "to win X on Y".
  - 1b: full-bleed bar 60px from bottom, `--color-brand-black`, 1px amber top border, same two lines in amber/muted.
  - CTA: enabled at 3+ picks (solid accent, `#0B0E0F` label); below 3, `--color-brand-surface` fill with `#6E7C82` label, non-interactive. Keep the existing guest state: swap the label to "Sign up to bet →" in amber for signed-out users.

### 3. Parlay ticket

- **1a** — dark card, 5px radius. Header strip on `--color-brand-black`: "PARLAY TICKET" Barlow 17px `.14em` left, "N LEGS" mono 11px right. Leg rows: 10px/12px padding, 1px `#1D2326` bottom rule, index in mono 10px `#4F5A5F`, picked team in Barlow 17px `.03em` lime, sub-line "to beat XXX · kickoff" in mono 10px `#6E7C82`, and a 24px square remove button (`--color-brand-surface`, 1px `--color-brand-line`). Multiplier row separated by a 1px dashed `--color-brand-line`, label Barlow 14px `.14em` muted, value mono 20px amber.
  - Stake card below: label, then a −10 / value / +10 row (44px square buttons, center well `--color-brand-black` with mono 26px figure over an 11px `.16em` "BETZ" label), then five quick amounts (10/50/100/250/ALL) at 34px min height, selected = lime border + `rgba(180,240,60,.14)` fill.
  - Payout panel: `--color-brand-black` fill, 1px `rgba(255,197,61,.35)`, centered — "TO WIN" Barlow 13px `.2em` amber, figure mono 44px amber, math line `stake × mult = total betz` mono 11px `#6E7C82`.
  - CTA: full-width 50px lime button, `#0B0E0F` label, "PLACE BET · LOCK IT IN".
- **1b** — the shareable artifact. Cream `#F4F1E8` card, `#14181B` text, 3px radius, 16px padding, entering with a 0.35s ease fade-up plus a −0.4° rotation that persists. Two 22px circles of page background at `top: 50%`, `left/right: -11px` make the punched notches (same technique as today's `.ticket-border`, new colors). Header "PARLAY STUB" Barlow 22px `.12em` over a 2px solid rule, ticket number mono 11px `#5A5F54` right. Leg rows separated by 1px dashed `#B9B4A4`: index mono 11px `#8A8474`, team Barlow 19px 700, sub-line "OVER XXX · kickoff" mono 10px `#6B675B`, remove button 24px with 1px `#B9B4A4`. Then Multiplier and Stake rows (Barlow 14px `.18em` `#6B675B` label, mono 22px value), then a 2px top rule and the "TO WIN" row with a mono 38px figure. Footer: "PLAY MONEY ONLY · SETTLES SUN 11:59 PM ET" mono 10px `#8A8474`.
  - Below the stub, on the dark page: "SET STAKE" label and five 44px quick-amount buttons (selected = amber border + `rgba(255,197,61,.16)`), then a full-width 52px amber "PRINT MY STUB" button.
- **Confirmation** — replaces the ticket after placing, 0.4s ease fade-up. 1a: a lime "TICKET LIVE" pill with pulsing dot, "YOU'RE ON THE BOARD" Barlow 40px, math line + "settles Sunday night" mono 12px, and a "SEE THE LEAGUE BOARD" button that navigates to Leagues. 1b: "STUB PRINTED" Barlow 40px, ticket number + math line, and a "SHARE TO LEAGUE" outline button.
- **Empty state** — keep today's copy and behavior ("No Games Selected" → Select Games), restyled to these tokens.

### 4. League board

Header: league name Barlow 26–27px uppercase, "8 members · wk 2 of 18" mono 11px `#6E7C82`. A settle/reset control sits top-right in the prototype purely to demo result motion — in production this state comes from `lib/resolve-parlays.ts`, not a button.

League cards (1a: bordered cards, 5px radius, 8px gaps · 1b: flat rows separated by 1px hairlines):
- Row one: 28–30px avatar (circle in 1a, 2px-radius square in 1b) with initial fallback, username IBM Plex Sans 13px 600, meta line "N-leg · Mx · S betz" mono 10px `#6E7C82`, and a right-aligned figure — mono 16–17px — with a Barlow 11px `.14–.16em` uppercase label reading "to win N" while pending, "won" / "lost" once settled. Signed net change: `+N` in lime, `−N` in `#FF6B5E`.
- Row two: one equal-width cell per leg showing the picked team abbreviation.
  - Pending: 1a `--color-brand-raised` chip with 1px `--color-brand-line`, `#6E7C82`; 1b a 2px `--color-brand-line` underline. Picks stay hidden until kickoff — keep today's "Pick hidden until kickoff" behavior and render those cells masked.
  - Won: lime — 1a `rgba(180,240,60,.16)` fill + `rgba(180,240,60,.4)` border; 1b lime 2px underline.
  - Lost: `#FF6B5E` — 1a `rgba(255,107,94,.14)` fill + `.4` border; 1b red underline plus `line-through`.
  - Result motion: each cell animates `rotateX(90deg) → 0` with opacity 0 → 1 over 0.45s ease when it resolves. Stagger by ~60ms per leg in production so a ticket resolves left to right.

### 5. Standings

- 1a: a header row on `--color-brand-black` (`#` / PLAYER / W-L / BETZ, Barlow 11px `.14em` `#6E7C82`) above a bordered list. Rows 11px/12px padding, `--color-brand-card`, 1px `#1D2326` separators, 3px transparent left border. Rank mono 14px 600 `#6E7C82`, username IBM Plex Sans 13px `#C7D0D4`, W-L mono 12px, betz mono 14px `#EDF1F2`.
- Current user's row: 3px lime left border, `rgba(180,240,60,.08)` fill, lime rank/name/betz.
- 1b: no header row; 2px top rule, 12px/8px rows, rank in Barlow 20px 700 `#4F5A5F`, amber treatment for the current user's row.

## Interactions & behavior

- **Pick** — tapping a team selects it; tapping the same team again deselects; tapping the opposing team swaps the pick within that game. Max 8 picks — additional games become non-interactive at the cap (keep today's `opacity-50` treatment). Min 3 to build. This is exactly today's `useTicketStore` logic; no changes needed.
- **Countdown** — one interval at 1s driving the header display. Derive from the weekly lock timestamp; clamp at zero.
- **Ticker** — CSS-only, pause on `prefers-reduced-motion: reduce`.
- **Navigation** — Games → Ticket via the floating bar; Ticket → Leagues after placing. Bottom nav switches tabs at any time.
- **Transitions** — color/border transitions 150ms on pick buttons and chips; entrance animations 0.35–0.45s ease; countdown dot pulse 1.6s infinite. Respect `prefers-reduced-motion` for the pulse, ticker, and leg flip.
- **Touch targets** — nothing below 44px on mobile: pick rows 46px (1a) / 52px (1b), stake buttons 44px, quick amounts 34–44px, tabs 56px.
- **Fallbacks** — the initial-letter team badge is load-bearing: 26px circle, `--color-brand-surface` fill, 1px border, Barlow 13px. Remote logo URLs are inconsistent and often missing; keep the existing `onError` hide.

## State

Unchanged from the current app: `selectedGames` + `betAmount` in `useTicketStore`, games from `/api/games`, wallet from `/api/wallet`, placement via `POST /api/parlays`. New local state: countdown seconds (interval), plus the existing `expandedRounds` map for week collapse. Multipliers stay `lib/constants.ts` — 3:5, 4:10, 5:20, 6:40, 7:80, 8:150.

## Responsive

Designed mobile-first at 390px. On `md:` and up, keep the existing top navbar and centered max-width column; the countdown bar spans the navbar's full width and the game cards widen with the column. The desktop layout of the chosen variant has not been designed yet — ask before inventing it.

## Assets

None bundled. Team logos remain remote URLs from the existing sync sources. Fonts are Google Fonts: Barlow Condensed, IBM Plex Sans, IBM Plex Mono.

## Files

- `FunBetz Redesign.dc.html` — the comparison canvas showing both variants side by side in phone frames. Open this first.
- `FunBetzScoreboard.dc.html` — variant 1a, fully interactive.
- `FunBetzStub.dc.html` — variant 1b, fully interactive.
- `original-brief.md` — the brief these were designed against.
