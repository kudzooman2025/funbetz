# FunBetz V2 — Code Review

**Date:** July 29, 2026
**Scope:** Full codebase — security, correctness, code quality, and architecture.
**Stack:** Next.js 16 (App Router) · React 19 · Prisma 7 (Postgres) · NextAuth v5 (beta) · Tailwind v4 · Zustand · Zod. A virtual-currency ("FunBucks") sports prediction app: parlays, brackets, tournaments, leaderboards, and cron sync jobs pulling live scores.

---

## Executive summary

The foundations are genuinely good. Authorization is applied consistently, money-moving code uses transactions, parlay odds are computed server-side (never trusted from the client), and the Prisma schema is well designed with real indexes and an audit-record pattern. That's a stronger baseline than most hobby projects.

The problems are concentrated in three places: **the app does not currently build** (a duplicated JSX wrapper), a set of **wallet/parlay edge cases that can permanently lock a user's balance or mint free currency**, and **significant duplication** (the entire parlay-resolution engine exists twice, and the tournament schedule data lives in five places and has already drifted).

Priority order for fixes:

1. Fix the build break in `schedule/page.tsx` (nothing ships until this is fixed).
2. Fix or delete the World Cup 2026 bracket page — it calls endpoints that don't exist and fails silently.
3. Close the wallet edge cases (cancelled-game lockup, payout lost-update, wallet-cap confiscation).
4. Fix the `NEXTAUTH_URL` vs `AUTH_URL` env drift that breaks password-reset links on a fresh deploy.
5. De-duplicate the resolution engine and the tournament data; add tests for the money and scoring math.

---

## Critical

### C1 — The app does not compile
`app/(app)/schedule/page.tsx:439-453`

The admin "Archive" tab wrapper is duplicated back-to-back:

```tsx
{isAdmin && (
{isAdmin && (
  <button onClick={() => setActiveTab("archive")} ...>
    ...
  </button>
)}
)}
```

`tsc` and `esbuild` both fail here (`TS1005: ',' expected`), so `next build` fails for the whole app. Every other `.tsx` file in the tree parses cleanly — this is an isolated botched edit. **Fix:** delete line 440 and line 452.

### C2 — World Cup 2026 bracket picks can never be saved or loaded
`app/(app)/brackets/wc2026/page.tsx:141,177`

The page fetches `/api/brackets/entry?challengeId=...` and posts to `/api/brackets/entry`, but the real route is `/api/brackets/[id]/entry` (the id is a path segment, not a query param). So `/api/brackets/entry` resolves to `/api/brackets/[id]` with `id="entry"` → GET 404, POST 405. Because `handleSave` only acts `if (res.ok)`, the failure is silent: the user clicks Save, sees nothing, and every WC2026 entry is lost. Either wire this page to the real entry route or delete it along with `lib/wc2026-config.ts` (its only consumer). Note that even if saving worked, WC picks have no scoring implementation (see Q-notes), so wiring it up is more than a one-line change.

### C3 — Wallet debit race in parlay creation (balance can go negative)
`app/api/parlays/route.ts:155-170`

The balance check inside the transaction is a plain non-locking `SELECT`, and the decrement has no guard condition:

```ts
const user = await tx.user.findUniqueOrThrow({ where: { id }, select: { walletBalance: true } });
if (user.walletBalance < betAmount) throw new Error("Insufficient wallet balance");
await tx.user.update({ where: { id }, data: { walletBalance: { decrement: betAmount } } });
```

At Postgres' default READ COMMITTED isolation, two concurrent bets of 800 against a balance of 1000 both read 1000, both pass, both decrement → balance −600 with two funded parlays. **Fix:** make the update conditional (`updateMany` with `where: { id, walletBalance: { gte: betAmount } }` and check `count === 1`), or add a DB CHECK constraint, or use `SELECT ... FOR UPDATE`.

---

## High

### H1 — A cancelled or postponed game permanently bricks the parlay *and* the wallet
`app/api/cron/resolve-parlays/route.ts:32-35` · `app/api/admin/resolve-parlays/route.ts:24-27` · `app/api/wallet/route.ts:56-65`

Both resolvers require every leg to be `COMPLETED` before doing anything; no code path ever voids or refunds a parlay containing a `CANCELLED`/`POSTPONED` game, and the schema's `GamePickResult.PUSH` value is never written anywhere. Combined with the replenish rule that blocks top-ups while any parlay is `PENDING`, the failure is: user goes all-in, one leg gets cancelled → parlay is stuck `PENDING` forever → stake never returned → balance 0 → replenish blocked forever. The account is unrecoverable without manual DB edits. **Fix:** treat cancelled/postponed legs as pushes (drop them from the parlay and recompute the multiplier) or void-and-refund the whole ticket.

### H2 — Payout credit is a lost-update write
`app/api/cron/resolve-parlays/route.ts:132-146` · `app/api/admin/resolve-parlays/route.ts:83-91`

Parlay *creation* correctly uses `{ decrement }`, but *resolution* does a read-then-absolute-write:

```ts
const user = await tx.user.findUniqueOrThrow({ where: { id: parlay.userId }, select: { walletBalance: true } });
const newBalance = Math.min(user.walletBalance + walletAdjustment, WALLET_MAX);
await tx.user.update({ where: { id: parlay.userId }, data: { walletBalance: newBalance } });
```

If the user places a new bet between the read and the write, that stake deduction is silently overwritten — minting free FunBucks. **Fix:** use `{ increment: walletAdjustment }` and enforce the cap with a follow-up clamp or a DB-side `LEAST()`.

### H3 — Wallet cap silently confiscates winnings and the stored payout is a lie
`app/api/cron/resolve-parlays/route.ts:86-88,138-141` · `lib/constants.ts:7,10`

Payout is credited as `Math.min(balance + payout, WALLET_MAX)` with `WALLET_MAX = 1000`. Example: balance 1000 → bet 250 on an 8-leg parlay (multiplier 150). The ticket screen and the POST response advertise a "Potential Payout" of 37,500; on a win the wallet goes 750 → `min(750 + 37,500, 1000) = 1000` — a net gain of 250 on an advertised 37,500. Worse, `ParlayResult.walletAdjustment` is stored as the full 37,500, so bet history reports a credit that never happened. Decide whether the cap is real: if yes, disclose it and cap the displayed/stored payout; if no, remove the `Math.min`.

### H4 — Seeded World Cup games are unresolvable and get duplicated by sync
`prisma/seed.ts` · `lib/constants.ts:92-104` · `app/api/cron/sync-games/route.ts:80-90,128-129`

The 104 seeded WC matches use externalIds like `wc26-gs-001`, but `WORLD_CUP` has no `skipSync` flag, so `sync-games` upserts TheSportsDB events keyed on their numeric `idEvent` — a different key for the same real match → duplicate Game rows shown to bettors. Meanwhile `updateActiveParlayGames` looks up `wc26-gs-001` against TheSportsDB, gets nothing, and `continue`s silently, so seeded games never reach `COMPLETED` — those parlays hang forever (feeding H1). **Fix:** add `skipSync` for manually-seeded WC data, or seed with the real provider event ids.

---

## Medium

### M1 — Draws lose the entire parlay, with no draw option offered
`app/api/cron/resolve-parlays/route.ts:62-70`

Winner is `home > away ? home : away > home ? away : null`, and a `null` winner counts as a loss. Soccer draws (~25% of matches, common in WC group stage) therefore kill any parlay containing that leg, and the games UI only offers the two teams so users can't price it in. Implement draw/push handling and, if soccer draws are bettable, a draw pick.

### M2 — Exact-score bonus and tiebreakers silently fail for penalty-shootout matches
`lib/bracket-scoring.ts:18-25` · `app/(app)/admin/page.tsx:759,1011` · `app/(app)/schedule/page.tsx:102-104`

Scores are parsed with `s.split("-")` and rejected unless there are exactly two parts, but admin stores PK results as `"1-1 PK4-3"`, which splits into three parts → `parseScore` returns null → no bonus points awarded, even to a user who nailed the 1-1. Per the hardcoded results, QF2 and SF2 both went to penalties, so 2 of 7 bonus-eligible matches were unscoreable. Parse the regulation score before the ` PK` suffix.

### M3 — The documented tiebreaker is never applied
`lib/bracket-scoring.ts:195` · `app/api/brackets/[id]/leaderboard/route.ts:18`

`countGroupScoreTiebreakers` has no call sites. The leaderboard orders by `[{ score: desc }, { updatedAt: asc }]`, but `updatedAt` is rewritten every recalc, so tied users are effectively ordered by whichever entry the recalc loop touched last — not by the 48 score predictions the UI tells them are "used as a tiebreaker."

### M4 — Betting window is not enforced server-side
`app/api/parlays/route.ts:124-139` · `lib/utils.ts:7-19` · `app/api/games/route.ts:31-41`

The parlay POST checks only `status === "SCHEDULED"` and kickoff > now + 1h. The next-Sunday window is applied only to the games *listing*, so a direct POST can bet games months out (e.g. lock a bet on the June 2026 WC final in January).

### M5 — Rescheduled games keep stale kickoff times
`app/api/cron/sync-games/route.ts:82-88`

The upsert `update` block refreshes scores/status/badges but not `scheduledStart` or `round`. A postponed match keeps its old time — wrong display, and the 1-hour buffer check evaluates against the stale timestamp.

### M6 — Kickoff timestamps parsed as server-local, not UTC
`lib/sports-api.ts:127`

`new Date(`${event.dateEvent}T${event.strTime}`)` — a datetime string with no offset is parsed as local time per the JS spec. TheSportsDB times are UTC, so on any non-UTC host every kickoff shifts by the TZ offset. It works today only because Vercel runs UTC; it breaks in local dev and on any other host. Append `Z` (or parse explicitly as UTC).

### M7 — HTML scraper fallback can fabricate results
`lib/modular11.ts:177-199`

The fallback takes the first `\d+-\d+` match anywhere in the page as the score (a date like `2026-05-03` yields 2026–05) and marks a game complete if the word "final" appears anywhere. `sync-bracket` then writes this into `BracketResult` (source "scraper") and rescores everyone. Tighten the pattern and anchor it to a known DOM location, or require the JSON API path.

### M8 — Replenish is a non-atomic check-then-set
`app/api/wallet/route.ts:39-72`

Reads balance, counts pending parlays, then writes an absolute balance. A payout committing in between is overwritten. Same class of bug as H2; fix with a conditional/atomic write.

### M9 — Route protection relies on a fragile prefix allowlist
`lib/auth.config.ts:10-19`

Middleware only gates `/dashboard, /games, /ticket, /parlays, /leaderboard, /wallet`. `/admin`, `/brackets`, `/tournaments`, `/schedule`, `/news` fall through to "allow," so their page shells render for logged-out users (the underlying admin APIs *do* re-check server-side, so no data leaks — but it's fragile and every new page must be remembered). Invert to an allowlist of *public* paths and protect by default.

---

## Low

- **Registration doesn't normalize email case, but reset flows do** (`app/api/register/route.ts:19-30` vs `forgot-password`/`forgot-username`). `User@x.com` and `user@x.com` become two accounts, and the first can never recover its password because the lookup lowercases. (`app/api/parlays/route.ts` and login also compare raw.)
- **`NEXTAUTH_URL` vs `AUTH_URL` drift** — `lib/email.ts:45,69` and `forgot-password/route.ts:43` read `NEXTAUTH_URL`, but `.env.example` defines only `AUTH_URL`. A fresh deploy following the example produces reset links of `undefined/reset-password?token=...`. `.env.example` also omits `RESEND_API_KEY`. **This one is worth promoting to a must-fix** since it breaks the whole password-reset flow on a clean deploy.
- **Cron secret is fail-open if unset** (`app/api/cron/*`) — if `CRON_SECRET` is missing, the expected header becomes `"Bearer undefined"` and anyone sending that passes. Comparison is also non-constant-time. Reject when the env var is empty.
- **No rate limiting** on login, register, or the forgot-password/username endpoints (brute force + inbox spam). bcrypt cost 12 is the only mitigation.
- **Email enumeration via timing** — forgot-password correctly always returns `{success:true}`, but only does DB writes + an awaited Resend call when the user exists, so response time leaks existence.
- **Password policy inconsistent** — register requires ≥8 chars, reset requires ≥6.
- **`leaderboardScore.update` (not upsert)** in both resolvers throws for any user lacking a row (only `/api/register` creates one), rolling back that user's whole resolution run every time.
- **`Parlay.multiplier` is `Float`** for money math — harmless today (integer values, `Math.round`ed) but fragile.
- **Golf sync never sets `completed_at`** and derives status from wall-clock, so the intended 1-hour resolution delay is bypassed for golf.

---

## Code quality & architecture

**Oversized files (confirmed line counts):** `admin/page.tsx` 1,180 lines, `brackets/[id]/page.tsx` 805, `games/page.tsx` 672, `schedule/page.tsx` 669 — each a single `"use client"` file with several inline sub-components and many `useState` hooks. The `components/` directory has only 5 files, so pages grow in place instead of sharing a component layer. Extract the admin sections, the bracket pick widgets (shared with the WC page), the game row/badge (needed by the ticket page too), and pull the embedded `Day1RecapArticle` out of `schedule` into `news/`.

**Duplication (the highest-value cleanup):**
- The **entire parlay-resolution engine exists twice** — `app/api/cron/resolve-parlays/route.ts` and `app/api/admin/resolve-parlays/route.ts` are the same algorithm, differing only in auth and whitespace. Any scoring change (like the PUSH handling above) must be made in both. Extract to `lib/resolve-parlays.ts`.
- The **scrape + recalculate logic** is copied between `cron/sync-bracket`, `admin/scrape`, and `admin/recalculate`.
- **`requireAdmin()` is copy-pasted** into four routes — and `admin/resolve-parlays` uses a *weaker* variant that trusts the JWT instead of re-checking the DB, so a demoted admin can still resolve parlays mid-session. Consolidate into one helper.
- The **48-game MLS NEXT schedule lives in five places** (`bracket-config.ts` GROUP_GAMES, `seed-mlsnext.ts` GAMES, `team-logos.ts`, `TEAM_RANKINGS`, and picks) and has **already drifted**: the seed has `away: "TBD"` where bracket-config has real team names, and `TEAM_RANKINGS` is missing "The Players Progression Academy" entirely (Group B lists only 3 teams). Make the seed import from `bracket-config`, and key logos/rankings off an id.
- The **tenant id `"va26-u13-ad"` is hardcoded 25 times across 15 files** even though `BRACKET_ID` is exported — the next tournament is a 15-file sweep.

**Server vs client components:** all 28 `(app)` pages are `"use client"` and fetch their own API routes via `useEffect` — a double round-trip on every page, and every API call re-runs `auth()`. There's no `loading.tsx`/`error.tsx`/`not-found.tsx` anywhere, and error handling is inconsistent (brackets page has no `.catch` → infinite spinner on a network error; wc2026 swallows failures). The read-only pages (leaderboard, parlays, wallet, tournaments, brackets list) are natural async server components calling Prisma directly.

**Type safety** is actually good — `strict: true`, `any` is rare (~8 uses). The main gap is `BracketEntry.picks` as an untyped JSON blob validated only by `typeof === "object"`; add a Zod schema and a typed accessor. `BracketResult.round`/`source` are free strings acting as an EAV table (13 round variants), and `.winner` doubles as a score-string holder for `*_score` rows — add enums and consider splitting score rows from winner rows.

**Config hygiene:** `next.config.ts` is empty (no `images.remotePatterns` despite remote team badges); several build-time deps (`prisma`, `typescript`, `@types/*`, `tailwindcss`) sit in `dependencies`; `vercel.json` cron comments contradict the actual schedule; and there are **no tests of any kind** — the parlay-resolution money math and `calculateScore` are pure and eminently unit-testable, which is the highest-value place to start.

**WC2026 scoring is unimplemented** (`lib/wc2026-config.ts` `WC_POINTS` has no consumer; recalc casts WC entries to the MLS pick shape and scores them ~0). Currently masked by C2, but part of "fix or delete the WC page."

---

## What's done well

- **Money mutations are transactional** and re-check `status === "PENDING"` inside the transaction; `ParlayResult.parlayId @unique` prevents double payout.
- **Server-side validation is real** — parlay POST validates the Zod schema, duplicate games, the multiplier table, game existence, SCHEDULED status, the 1-hour buffer, and that the picked team is actually in the game. Odds are never trusted from the client.
- **No IDOR** — every user route scopes queries to `session.user.id`; tournament member/leave/remove routes verify ownership; bracket entries are keyed on `[userId, challengeId]`.
- **Password reset is solid** — 32-byte random tokens, 1-hour expiry, single-use, prior tokens invalidated, applied in a transaction; bcrypt cost 12; `isAdmin` fetched fresh from the DB at login.
- **No hardcoded secrets**, `.gitignore` correctly covers `.env`, and no XSS (the two `dangerouslySetInnerHTML` uses render only static HTML entities).
- **Schema quality is above average** — snake_case mapping, cuids, correct enums, purposeful composite uniques and indexes, thoughtful cascade choices, and an immutable `ParlayResult` audit record.
- **Sync jobs are pragmatic** — inter-league rate-limit delays, round-window syncing, a `skipSync` flag, and refreshing games referenced by active parlays. The scraper is a careful human-in-the-loop design that preserves manual admin overrides.

---

*Findings were produced by reading the actual source and spot-verified (the build break, the missing WC endpoints, and the wallet write patterns were confirmed directly). Line numbers refer to the code as staged on July 29, 2026.*
