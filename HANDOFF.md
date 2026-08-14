# FunBetz — Handoff

Rolling record of what's been built, why, and what's next. Supersedes
`IMPLEMENTATION_PLAN.md` (fully executed — see below) as the current source of truth.

Last updated: August 2026

---

## How to ship

From the project root:

```cmd
ship "your commit message"
```

`ship.cmd` clears any stale `.git\index.lock`, stages, commits, pushes to
`origin/master`, and fires the Vercel deploy hook — stopping immediately if any
step fails. Build takes ~2 minutes.

**If the schema changed**, follow with:

```cmd
npx prisma db push
```

There is no `prisma/migrations/` directory (it's gitignored), so `db push` is
the schema-sync mechanism, not `migrate deploy`.

Local builds need a dummy `RESEND_API_KEY` (`lib/email.ts` constructs the Resend
client at module scope). The real key lives in Vercel.

---

## Completed work

### 1. World Cup + Virginia Regional removal (IMPLEMENTATION_PLAN.md)

Fully executed and verified in production.

- Removed the World Cup feature (archived first to `_archive/world-cup-2026/`)
  and all MLS NEXT / Virginia Regional content: pages, API routes, libs, seed
  scripts, logos, and the `sync-bracket` cron.
- Dropped `BracketChallenge` / `BracketEntry` / `BracketResult` from the schema
  and the corresponding tables from Neon.
- Purged production data: 104 WC games, 48 MLS NEXT games, 50 parlay legs,
  3 bracket entries, 79 bracket results, 1 challenge row. All counts verified 0.
- A Neon branch `backup-before-purge` was taken before the purge.

### 2. Betting + parlay resolution hardening

The betting model is winner-pick parlays (3–8 legs, fixed multipliers in
`lib/constants.ts`). The old resolution logic was duplicated and had several
money-affecting bugs. All fixed:

- **One shared resolver** — `lib/resolve-parlays.ts`. Both
  `/api/cron/resolve-parlays` and `/api/admin/resolve-parlays` call it, so the
  payout algorithm exists in exactly one place.
- **Atomic wallet credits** — payouts use `{ increment }` plus a guarded clamp
  to `WALLET_MAX`, replacing a read-then-absolute-write that could erase a
  concurrent stake deduction and mint currency.
- **Conditional debit on bet placement** — `updateMany` with a
  `walletBalance >= betAmount` guard, so concurrent bets can't drive a balance
  negative.
- **Ties, cancelled and postponed games are PUSH**, not losses. Pushed legs are
  dropped and the multiplier recomputed from the remaining leg count; if fewer
  than `MIN_PARLAY_GAMES` survive, the stake is refunded and the parlay is
  `CANCELLED`. This also fixed the trap where one cancelled game left a parlay
  PENDING forever, permanently blocking wallet replenish.
- **Leaderboard upsert** instead of update, so a user with no leaderboard row
  can't throw and roll back the whole run.
- **UTC kickoff parsing** (`parseUtcTimestamp`) — times were being parsed as
  server-local, shifting every kickoff and therefore every betting window.
- **Cron routes fail closed** when `CRON_SECRET` is unset (previously
  `Bearer undefined` authenticated).
- **Betting window** widened to end Tuesday 07:59:59 UTC so it covers Sunday
  and Monday night football, and it is now enforced server-side in the parlay
  POST, not only in the games listing.

All three engine paths (win, refund-via-pushes, WALLET_MAX clamp) have been
exercised against production data and behaved correctly.

Tests: `npm test` runs `scripts/test-resolve-parlays.ts` (15 tests) and
`scripts/test-cfb-source.ts` (19 tests).

### 3. Schedule data sources

**The problem:** TheSportsDB's free API key caps every request at ~5 events.
NFL Week 1 returned 5 games instead of 16. A full season was impossible.

**The fix:** `lib/espn-source.ts` — a key-free, uncapped provider using ESPN's
public scoreboard endpoints, configured per league in `ESPN_LEAGUES`:

| League | Path | Notes |
|---|---|---|
| NFL | `football/nfl` | preseason + 18 weeks + playoffs |
| NCAAF | `football/college-football` | `groups=80` restricts to D1 FBS |

Round numbers are banded so they never collide: preseason `501+`, regular
season `1–18`, postseason `101+`. The UI labels these as "Preseason Week N",
"Week N", and the real playoff round names.

`lib/cfb-source.ts` additionally supports **CollegeFootballData** — set
`CFBD_API_KEY` and college football automatically switches to it (free key,
1,000 calls/month, one call per season). No code change needed.

`lib/game-sync.ts` is the shared sync engine:
- `syncProviderSeason(league)` — full season in one pass for provider-backed
  leagues (NFL, NCAAF), batched 50 upserts per transaction. Deletes stale rows
  from other providers that have no parlay legs attached.
- `syncLeagueRounds(league)` — rolling round window for the remaining leagues,
  still on TheSportsDB and therefore still capped at ~5 games/round.
- `syncAllLeagues()` — nightly orchestrator.

Loaded in production: **946 D1 FBS games**, **334 NFL games**.

Admin page has "Load CFB Season" and "Load NFL Season" buttons. Manual trigger:

```cmd
curl -H "Authorization: Bearer <CRON_SECRET>" https://funbetz.life/api/cron/sync-games
```

**Season config lives in `lib/constants.ts`** and must be bumped each year:
EPL 2026-27 (Aug 21), NFL 2026 (Sep 9), NCAAF 2026 (Aug 29), NHL 2026-27
(Sep 29), NBA 2026-27 (Oct 20 — approximate, confirm when the schedule drops).

### 4. Show the full schedule, gate the betting

`/api/games` returns the **entire** upcoming schedule (no window filter), with
each game carrying a `bettable` flag plus the window bounds. The games page
groups by league → week; weeks outside the window collapse by default but are
fully expandable and viewable — locked games show teams, logos and kickoff
times with a 🔒 and simply aren't clickable. `POST /api/parlays` independently
rejects out-of-window games, so a locked game can never be wagered on.

### 5. Guest browsing

"Get Started" now drops visitors into the app rather than the signup form.
Dashboard, schedules and the leaderboard are public. The moment a guest selects
enough games, the CTA becomes "Sign up to bet →". Ticket, parlays, wallet and
admin remain gated in `lib/auth.config.ts`.

### 6. Tournaments → Leagues

Route is `/leagues`; all user-facing copy says League. **Internal model and API
paths remain `tournament`** (`/api/tournaments/*`, Prisma `Tournament`) on
purpose — "league" already means *sports* league in this codebase (NFL, EPL),
and renaming would create real ambiguity.

Includes shareable invite links: `funbetz.life/leagues/join/<CODE>` with a
"Copy invite link" button. Guests get an invite page and the destination is
preserved through signup *and* login via `callbackUrl`, so a texted link works
end to end for someone without an account.

### 7. League cards with per-person sharing (latest)

- `User.shareParlays` — opt-in, default **off**. Nobody's picks are visible
  until they choose it.
- `GET /api/tournaments/[id]/parlays` — league-mates' cards, scoped to the
  league's date window, members only.
- **Picks stay hidden until each game kicks off**, even on shared cards, so
  nobody can copy a hot board pre-lock. The card's shape (legs, stake,
  potential payout) is always visible.
- `components/leagues/league-cards.tsx` — the Cards tab, including the toggle.

⚠️ Requires `npx prisma db push` to add the `share_parlays` column.

---

## Next up

1. **League chat** — new Prisma model (`tournamentId`, `userId`, `body`,
   `createdAt`, indexed on `tournamentId + createdAt`). Poll every ~10s rather
   than websockets (Vercel serverless). Requires a schema change.
2. **Activity feed** — the highest-value item for engagement. One stream at the
   top of the league mixing picks, results and comments ("Kudzooman hit a
   4-leg, +150", "Tarikan is on a 3-week streak"). Chat alone in a quiet league
   feels dead; chat inside a feed of activity feels alive.
3. **Per-member W/L record and streak**, "biggest win this week", and a
   countdown to the weekly lock for urgency.
4. **Verify** the league leaderboard truly filters by the league's start/end
   dates before building anything new — it may already be correct.
5. Point the remaining leagues (NBA, NHL, MLB, EPL) at ESPN to escape the
   5-game cap. Those are date-based rather than week-based in ESPN's API, so
   they need a different fetch strategy than NFL/NCAAF.

---

## Gotchas worth remembering

- **Large TSX files**: edit via a Python script, not whole-file rewrites.
- **Neon**: raw Postgres (5432) is unreachable from the Claude sandbox; the
  HTTPS SQL endpoint is reachable. DB work is done through the Neon console's
  SQL editor.
- **GitHub**: the sandbox's git proxy only injects credentials for repos in the
  session's authorized set. Connect the repo as a **GitHub source when creating
  the task** to allow direct commits and pushes.
- **Legacy tables**: `derby_picks` and `derby_results` exist in production but
  are not in `schema.prisma`. Pre-existing, untouched.
- Deploy hook (bypasses Deployment Protection):
  `https://api.vercel.com/v1/integrations/deploy/prj_bjq1FnwbQK6UlRLtTXNPwDiAJWlr/SG8xaVibld`

---

## Next session: UI/UX redesign with Claude Design

### Intent

Redesign the FunBetz interface to look better and feel more "grabby" —
specifically the league experience, but the visual language across the app
generally. The app is functionally solid; this is a polish and engagement pass,
not a rebuild.

### How Claude Design actually fits

Claude Design projects hold **design artifacts** — self-contained HTML component
previews and tokens. They are not pointed at this repo and do not review source
code. The Cowork session is the bridge:

1. Cowork (with this folder connected) reads the real code and extracts the
   existing design tokens and component patterns.
2. Those get built into a design-system project on claude.ai/design.
3. Iterate visually there — try directions, compare, choose.
4. The same Cowork session ports the chosen design back into the React
   components and ships it.

Expect a translation step in both directions: Claude Design works in
self-contained HTML, this app is Next.js + Tailwind. That is a feature, not a
bug — it forces one component at a time instead of a risky big-bang rewrite.

**Start small.** Extract the tokens and two or three components, confirm the
round trip works end to end, *then* scale up. Discovering friction after
redesigning fifteen components is the failure mode to avoid.

### Scope — do these three first

Ordered by value. Redesign these and the app feels new; redesign everything and
it takes weeks.

1. **Games / picking flow** — the core loop, where users actually spend time.
2. **Parlay card** — the thing people screenshot and text to friends. It is
   effectively the marketing surface.
3. **League page** — the social hook (cards, leaderboard, and soon chat/feed).

### The design system that already exists

Extract these rather than inventing from scratch:

- **Tokens** in `tailwind.config.ts`: `brand-green`, `brand-gold`, `brand-dark`,
  `brand-card`, `brand-surface`, `brand-border`, `brand-muted`.
- **Patterns**: the card container (`bg-brand-card border border-brand-border
  rounded-lg`), the status pill (see `STATUS_STYLES` in
  `components/leagues/league-cards.tsx`), `GameRow` and its locked variant in
  `app/(app)/games/page.tsx`, the collapsible week header, and the team badge
  with initial-letter fallback.

### Beyond visual style

A large part of "grabby" is information architecture and motion, not colour:

- What is on screen **first** — the open week should lead, not week 1 of 18.
- **Urgency** — a countdown to the weekly betting lock.
- **Movement** — live standings changes, results animating in, streak badges.
- **Social proof** — an activity feed mixing picks, results and comments.

Treat these as design problems in the redesign, not as afterthoughts.

### Suggested opening prompt for the new session

> Redesign the FunBetz games page and parlay card. Start by extracting the
> current design tokens from `tailwind.config.ts` and the existing component
> patterns, then propose 2–3 directions before building anything.

Asking for a few directions before committing is worth it — reacting to options
is much easier than describing a design from scratch.

---

## Session startup checklist

For whoever picks this up next:

1. **Connect the folder** `C:\Users\PM1\Funbetz V2` as usual, **and connect
   `kudzooman2025/funbetz` as a GitHub source** when creating the task. Without
   the GitHub source, the assistant cannot push — it can only write files to
   disk and hand over commands. With it, the whole loop is automated.
2. **Read this file and project memory first.** Memory has the detail behind
   each decision.
3. **Outstanding before new work:**
   - `ship "League cards with per-person sharing opt-in"` if not already done.
   - `npx prisma db push` — adds the `share_parlays` column. The Cards tab will
     error until this runs.
4. **Then either** the redesign above, **or** finish the league social features
   (chat + activity feed) described in "Next up".
