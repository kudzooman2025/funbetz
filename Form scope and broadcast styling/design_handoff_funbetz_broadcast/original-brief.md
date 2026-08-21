# FunBetz — Design Brief for Claude Design

Extracted from the live codebase (Next.js + Tailwind v4), Aug 14 2026.
Repo: https://github.com/kudzooman2025/funbetz (public) · Live: https://funbetz.life

FunBetz is a free-to-play sports **parlay** app. Users pick winners in 3–8 games,
stake play-money "betz", and compete on a leaderboard and in private Leagues with
friends. No real money. Currently NFL (preseason underway), college football,
EPL, NBA, NHL, PGA/LIV golf.

---

## 1. Current tokens (the real source of truth)

Defined in `app/globals.css` via Tailwind v4 `@theme` — **not** in
`tailwind.config.ts`, which only sets the font and explicitly defers colors.

```css
@theme {
  --color-brand-green:   #00C853;  /* primary action, selected pick, wins */
  --color-brand-gold:    #FFD600;  /* payouts, multiplier, "to win" */
  --color-brand-dark:    #0A0E17;  /* page background */
  --color-brand-card:    #161C2D;  /* card surface */
  --color-brand-border:  #2A3350;  /* hairlines, unselected borders */
  --color-brand-muted:   #94A3B8;  /* secondary text */
  --color-brand-surface: #1E2540;  /* raised surface, badges, inputs */
}
```

- Body text `#F1F5F9` on `--color-brand-dark`. Dark mode only; there is no light theme.
- Display/numeral font: **JetBrains Mono** (`--font-jetbrains-mono`), used for
  payouts and wallet figures. Body is the default sans stack.
- Status colors beyond brand: yellow-500 (pending), red-400 (loss), gray-500 (cancelled).

**The palette is open for this redesign.** Treat the above as the current state to
react against, not a constraint. Dark-first should stay.

---

## 2. Existing component anatomy

Patterns to preserve in *function* while reinventing in *form*.

**Card container** — `bg-brand-card border border-brand-border rounded-lg`.
Used for every surface. Currently flat: no elevation, no gradient, no depth.

**GameRow** (the core interaction, `app/(app)/games/page.tsx`)
A horizontal row: kickoff time (ET, two lines, ~60px) · home-team pick button ·
"VS" · away-team pick button. Each pick button is a full-height bordered box with
a 24px circular team badge and truncated team name. Selecting turns it
`bg-brand-green/20 border-brand-green text-brand-green`; the parent card border
also goes green. Golf swaps "VS" for ⛳.

**GameRow — locked variant**
Same layout at `opacity-70`, borders muted, not clickable, with a 🔒 and short
date pinned right. Locked games are *visible on purpose* — users browse the full
season, but can only bet inside the current window.

**Week header** (collapsible)
`▾ Collapse` / `▸ Expand` · week name · game count · then either a green pill
`N open for picks` or a muted pill `🔒 Picks not open yet`. Weeks with open games
expand by default; the rest collapse.

**Team badge** — 24px circle; remote logo URL, falling back to an initial letter
on `bg-brand-surface`.

**Floating ticket bar** — fixed bottom, green-bordered card: "N games selected"
+ "(need N more)" and a Build Ticket CTA that changes by state (disabled →
"Sign up to bet →" for guests → active).

**Parlay ticket** (`/ticket`) — a `.ticket-border` dashed-border card with
punched-out circular notches on both sides (real CSS, `::before`/`::after`), leg
list, multiplier row, stake stepper with quick-amounts (10/50/100/250/ALL IN),
and a big "Potential Payout" panel showing `10 x 5 = 50`.

**Status pill** (`STATUS_STYLES`) — PENDING amber / WON green / LOST red /
CANCELLED gray, all as `bg-*/15 text-* border-*/30` rounded-full.

**League card** — avatar circle + username + status pill; second line has
`3-leg · 5x`, stake, and either gold "To win N" or a signed green/red net change;
expands to per-leg rows marked ✅ ❌ ➖. Picks stay hidden until kickoff, shown as
"Pick hidden until kickoff".

---

## 3. What to redesign — in priority order

1. **Games / picking flow** — the core loop, where time is actually spent.
2. **Parlay card** — the thing people screenshot and text to friends. It is
   effectively the app's marketing surface. It should look *worth sharing*.
3. **League page** — the social hook: cards, leaderboard, and soon chat + an
   activity feed.

---

## 4. Direction to explore: broadcast scoreboard

Retro-modern stadium/ESPN energy — mono numerals, scoreboard-row rhythm, ticker
motion, strong sense of "game time". Serious production values, even though the
stakes are play money.

Worth pushing on:

- **Numerals as a design element.** Payouts, multipliers, wallet, scores.
- **The lock countdown.** A live countdown to the weekly betting lock is the
  single biggest urgency lever and currently doesn't exist.
- **Open week leads.** Today the page opens on the first week of 18; it should
  open on what's bettable now.
- **Result motion.** Legs resolving, standings shifting, streak badges.
- **Density that still reads on mobile.** Most usage is phone-sized.

---

## 5. Constraints for anything that ships

- Next.js App Router + **Tailwind v4** (`@theme` in `globals.css`, no config-file colors).
- Components are React/TSX; Claude Design output arrives as self-contained HTML
  and gets ported by hand, one component at a time. Design accordingly — favor
  patterns that survive translation to utility classes.
- Dark only. Mobile-first: there is a bottom nav on small screens, a top navbar on desktop.
- Team logos are remote URLs of inconsistent size/shape, and often missing —
  the initial-letter fallback is load-bearing, not an edge case.
