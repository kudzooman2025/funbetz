# FunBetz — Implementation Plan (WC/VA removal + NFL/CFB readiness)

Companion to `CODE_REVIEW.md`. This is the execution checklist for the changes decided on July 29, 2026: remove the World Cup feature (archived first), remove all Virginia Regional / MLS NEXT content (already exported to a portable bundle for f6ad.space), and make sure NFL and College Football can take bets and resolve payouts accurately and consistently.

Ship method: commit to `master` and deploy. First clear the stale lock, then commit and push, then trigger the deploy. See "Deploy" at the bottom.

---

## Priority 0 — Build break (must fix, app does not compile)

`app/(app)/schedule/page.tsx` around lines 439–453 has a duplicated `{isAdmin && (` wrapper and a duplicated closing `)}`. Delete the second `{isAdmin && (` (line ~440) and the second `)}` (line ~452). Note: this file is being deleted entirely in the VA removal below, so if you remove the schedule page this fix is moot. Fix it only if the page survives.

---

## Priority 1 — NFL / College Football betting + resolution (the important one)

The betting model is winner-pick parlays (3–8 legs, fixed multipliers from `lib/constants.ts`). NFL (`id 4391`) and NCAAF (`id 4479`) are already in `LEAGUES` with `skipSync` off, so they sync from TheSportsDB. The gaps are in resolution correctness and a few sync/window details.

### 1a. Extract one shared resolver (removes the duplicate engine)
`app/api/cron/resolve-parlays/route.ts` and `app/api/admin/resolve-parlays/route.ts` are the same algorithm copied twice. Create `lib/resolve-parlays.ts` exporting `resolvePendingParlays(prisma)` and have both routes call it. All fixes below go in that one function.

### 1b. Payout must use atomic increment, not read-then-write (H2)
In resolution, replace the read-balance / `Math.min(balance + adj, WALLET_MAX)` / absolute-write with an atomic `{ increment: walletAdjustment }`, then clamp to `WALLET_MAX` in a second guarded update (or a raw `LEAST(...)`). The current pattern silently erases a concurrent stake deduction and mints currency.

### 1c. Debit on bet placement must be conditional (C3)
In `app/api/parlays/route.ts`, replace the non-locking balance check + unconditional `{ decrement }` with a conditional update: `updateMany({ where: { id, walletBalance: { gte: betAmount } }, data: { walletBalance: { decrement: betAmount } } })` and treat `count === 0` as "insufficient funds". Prevents concurrent bets from driving the balance negative.

### 1d. Ties / cancelled / postponed = PUSH, not loss (H1, M1, NFL ties)
Current winner logic: `home>away ? home : away>home ? away : null`, and a `null` winner is scored as a loss, and any non-COMPLETED leg blocks the whole parlay forever.
- A **tie** (equal score after regulation/OT: possible in NFL, and in soccer if you ever re-add it) should mark that leg `PUSH`, not a loss.
- A **CANCELLED / POSTPONED** game should mark that leg `PUSH` (or void+refund the ticket).
- On resolution, **drop pushed legs and recompute the multiplier** from the remaining leg count (e.g. a 4-leg parlay with one push pays as a 3-leg parlay). If fewer than `MIN_PARLAY_GAMES` remain after pushes, refund the stake.
- Write the `GamePickResult.PUSH` value that already exists in the schema.
This also fixes the "one cancelled game bricks the wallet forever" trap (a stuck PENDING parlay blocks wallet replenish permanently).

### 1e. leaderboardScore upsert, not update (L2)
Both resolvers call `leaderboardScore.update`, which throws for any user without a row and rolls back the whole run. Use `upsert`.

### 1f. Parse kickoff times as UTC (M6)
`lib/sports-api.ts` builds `new Date(`${dateEvent}T${strTime}`)` with no offset, so it is parsed as server-local time. TheSportsDB times are UTC. Append `Z` (or construct with `Date.UTC`). Wrong here means wrong betting windows and wrong 1-hour lock on any non-UTC host.

### 1g. Refresh scheduledStart + round on resync (M5)
In `app/api/cron/sync-games/route.ts`, the upsert `update` block only writes scores/status/badges. Add `scheduledStart` and `round` so postponed/flexed games (common in NFL: Sunday → Thursday/Monday flex) get corrected times, which the 1-hour lock depends on.

### 1h. Betting window must cover the NFL week + be enforced server-side (M4, L7)
- The window in `lib/utils.ts` ends Sunday 23:59:59 **UTC**, which is ~7:59pm ET, cutting off Sunday Night Football and Monday Night Football. Widen the window to cover Thursday through Monday night for football, or make it league-aware.
- Enforce the window in the parlay POST (`app/api/parlays/route.ts`), not only in the games listing. Right now a direct POST can bet games far in the future.

### 1i. Confirm final-status strings for football
`lib/constants.ts` has NFL/NCAAF `completedStatuses: ["Game Over","FT"]`. TheSportsDB also uses `AOT` (after overtime) and sometimes `Final`. Add `"AOT","Final"` so overtime finals resolve. Verify against a live sync (see 1j).

### 1j. Verify end-to-end before relying on it
After deploy, hit `/api/cron/sync-games` (with the cron secret) and confirm NFL/NCAAF games land with correct `scheduledStart` (UTC) and status transitions to a completed status. Place a test 3-leg parlay, force results, run `/api/admin/resolve-parlays`, and confirm the wallet credit equals `round(stake * multiplier)` clamped at `WALLET_MAX`, a push recomputes the multiplier, and the leaderboard updates. Add unit tests for the resolver math and `calculateScore` while you are in there (no tests exist today).

### 1k. Also set CRON_SECRET hardening
The cron auth compares to `Bearer ${process.env.CRON_SECRET}` and is fail-open if the env var is unset (`Bearer undefined` passes). Reject when the secret is empty. Confirm `CRON_SECRET` is set in the Vercel project.

---

## Priority 2 — Archive, then remove World Cup

Archive first (per decision): copy `lib/wc2026-config.ts` and `app/(app)/brackets/wc2026/page.tsx` into an `_archive/world-cup-2026/` folder (or keep them in git history via the commit message) before deleting. The WC bracket never worked anyway (it POSTs to `/api/brackets/entry`, which does not exist).

Remove:
- `app/(app)/brackets/wc2026/` (the page)
- `lib/wc2026-config.ts`
- The `WORLD_CUP` entry in `LEAGUES` (`lib/constants.ts`)
- The 104 seeded WC matches in `prisma/seed.ts` (search `wc26-`)
- Any WC links in `dashboard`, `news`, nav, and the `featured` flag reference
Grep for `WORLD_CUP`, `wc2026`, `wc26-`, `WC_` and clear every hit.

---

## Priority 3 — Remove all Virginia Regional / MLS NEXT content

Everything here is preserved in the exported bundle (`va-regional-2026.zip`), so deletion is safe. This is the largest surface; grep `va26-u13-ad`, `MLSNEXT`, `bracket`, `mlsnext` to catch stragglers.

Pages/UI:
- `app/(app)/schedule/page.tsx`
- `app/(app)/brackets/` (the `[id]` picker, the landing `page.tsx`) if brackets are not used for anything else
- `app/(app)/news/` (all 5 recap articles + the news index) if news is only these tournament recaps
- Bracket sections in `app/(app)/admin/page.tsx` (group score / matchup / knockout editors)
- Bracket + schedule + news links in `dashboard`, nav (`navbar.tsx`, and the removed `bottom-nav.tsx`)

Lib/data:
- `lib/bracket-config.ts`, `lib/team-logos.ts`, `lib/modular11.ts`, `lib/bracket-scoring.ts`, `lib/wc2026-config.ts` (also WC)
- `prisma/seed-mlsnext.ts`, `prisma/seed-bracket.ts`, `prisma/purge-brackets.ts`
- The `MLSNEXT` entry in `LEAGUES`
- `public/logos/*` (33 files), and the root docs: the `.xlsx`, `MLS NEXT Cup Seeding Explained.pdf`, `funbetz-bracket-qr.png`

API routes:
- `app/api/brackets/**`, `app/api/bracket-scores/`, `app/api/scores/`
- `app/api/cron/sync-bracket/`
- `app/api/admin/bracket-results/`, `app/api/admin/recalculate/`, `app/api/admin/scrape/`
- Remove the `sync-bracket` cron from `vercel.json`

Data model (`prisma/schema.prisma`):
- Drop `BracketEntry` and `BracketResult` models and any relations to them, then create a migration. Leave `Parlay`, `Game`, `User`, `Wallet`, `LeaderboardScore`, `Tournament` intact.

After removal, confirm the app still builds and the remaining leagues (NFL, NCAAF, NBA, NHL, MLB, EPL, PGA, LIV) plus parlays/tournaments/wallet/leaderboard all work.

---

## Priority 4 — Production database purge (Neon)

The production database is **Neon Postgres** — there is no Supabase or MCP-connector path to it, so this runs from your machine, where `.env` holds the Neon `DATABASE_URL`. Execute it with either `psql "$DATABASE_URL" -f cleanup.sql` or a one-off `tsx` script using the `pg` Pool (the same connection setup `prisma/seed-mlsnext.ts` already uses). Do this **after** the code deploy is live, so the app is no longer reading the rows being deleted.

Every table/column name below is the real snake_case physical name from `prisma/schema.prisma` (`@@map` / `@map`), verified against the schema — not the Prisma model name. `va26-u13-ad` is confirmed to be the literal `bracket_challenges.id` / `challenge_id` value (see `prisma/purge-brackets.ts`).

**Back up first.** In the Neon console, create a branch from `production` before running anything — it's an instant, cheap, one-click rollback point, and these deletes are irreversible.

### Step 1 — Verify counts (read-only, run first)
```sql
SELECT count(*) AS wc_games      FROM games WHERE external_id LIKE 'wc26-%'   OR sport = 'WORLD_CUP';
SELECT count(*) AS mlsnext_games FROM games WHERE external_id LIKE 'mlsnext-%' OR sport = 'MLSNEXT';
SELECT count(*) AS va_entries    FROM bracket_entries    WHERE challenge_id = 'va26-u13-ad';
SELECT count(*) AS va_results    FROM bracket_results    WHERE challenge_id = 'va26-u13-ad';
SELECT count(*) AS va_challenge  FROM bracket_challenges WHERE id = 'va26-u13-ad';
```

### Step 2 — Safety check: any real bets on these games? (read-only)
`games → parlay_games` has **no** cascade delete, and silently removing a leg corrupts that parlay's `num_games` / `multiplier`. Confirm nothing is stranded before deleting:
```sql
SELECT p.id AS parlay_id, p.status, count(*) AS affected_legs
FROM parlay_games pg
JOIN parlays p ON p.id = pg.parlay_id
WHERE pg.game_id IN (
  SELECT id FROM games
  WHERE external_id LIKE 'wc26-%'    OR sport = 'WORLD_CUP'
     OR external_id LIKE 'mlsnext-%' OR sport = 'MLSNEXT'
)
GROUP BY p.id, p.status;
```
If this returns **0 rows**, Step 3 is safe as written. If it returns any **PENDING** parlay, void + refund it first (credit `bet_amount` back to the user's `wallet_balance`, set the parlay to `CANCELLED`) before proceeding — do not just delete a live ticket's legs.

### Step 3 — Delete (single transaction)
```sql
BEGIN;

-- 1. Detach parlay legs on these games (reached only after Step 2 is clear/handled)
DELETE FROM parlay_games
WHERE game_id IN (
  SELECT id FROM games
  WHERE external_id LIKE 'wc26-%'    OR sport = 'WORLD_CUP'
     OR external_id LIKE 'mlsnext-%' OR sport = 'MLSNEXT'
);

-- 2. World Cup games
DELETE FROM games WHERE external_id LIKE 'wc26-%' OR sport = 'WORLD_CUP';

-- 3. MLS NEXT / Virginia Regional games
DELETE FROM games WHERE external_id LIKE 'mlsnext-%' OR sport = 'MLSNEXT';

-- 4. VA bracket data (deleting the challenge cascades to entries/results,
--    but delete explicitly so it works even if the challenge row is gone)
DELETE FROM bracket_entries    WHERE challenge_id = 'va26-u13-ad';
DELETE FROM bracket_results    WHERE challenge_id = 'va26-u13-ad';
DELETE FROM bracket_challenges WHERE id = 'va26-u13-ad';

COMMIT;
```

### Step 4 — Confirm
Re-run the Step 1 SELECTs; every count should now be `0`.

Interaction with the Priority 3 migration: if you drop the `BracketEntry` / `BracketResult` models, `prisma migrate deploy` drops `bracket_entries` and `bracket_results` outright, which supersedes parts 4a/4b of Step 3 — but **not** the `games` deletes (parts 1–3) or the `bracket_challenges` row, so keep those. Run the migration and this purge in the same maintenance window.

## Deploy

Your local git had a stale lock and the cloud sandbox could not clear it or push. On your own machine (full access), the sequence is:

```bash
cd "path/to/Funbetz V2"
rm -f .git/index.lock          # clears the stuck lock
git add -A
git commit -m "Remove World Cup + Virginia Regional; harden NFL/CFB betting and parlay resolution"
git push origin master         # your local master is ahead of a stale origin ref; this fast-forwards
# then trigger the deploy hook (bypasses Deployment Protection):
curl -X POST "<your funbetz/master deploy hook URL>"
```

If the DB model changed, run the Prisma migration against production before or as part of the deploy (`prisma migrate deploy`).

Your uncommitted in-progress work (nav/games/layout/tailwind edits) is real and should be reviewed as part of this commit; it is included in `git add -A`.
