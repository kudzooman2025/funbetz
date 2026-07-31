-- ============================================================================
-- FunBetz production purge: World Cup 2026 + MLS NEXT / Virginia Regional
-- Target: Neon Postgres (run from your machine with .env's DATABASE_URL)
--
--   psql "$DATABASE_URL" -f scripts/purge-wc-va.sql
--
-- BEFORE RUNNING:
--   1. In the Neon console, create a branch from `production` (instant,
--      one-click rollback point). These deletes are irreversible.
--   2. Deploy the code first, so the app is no longer reading these rows.
--   3. Run THIS script BEFORE `npx prisma db push` — db push drops the
--      bracket tables entirely (the models were removed from schema.prisma),
--      and the verification queries below need the tables to still exist.
--      Order in the maintenance window:  deploy → this purge → db push.
--
-- All table/column names are the physical snake_case names from
-- prisma/schema.prisma (@@map/@map). 'va26-u13-ad' is the literal
-- bracket_challenges.id / challenge_id value.
-- ============================================================================

-- ── Step 1 — Verify counts (read-only) ──────────────────────────────────────
SELECT count(*) AS wc_games      FROM games WHERE external_id LIKE 'wc26-%'   OR sport = 'WORLD_CUP';
SELECT count(*) AS mlsnext_games FROM games WHERE external_id LIKE 'mlsnext-%' OR sport = 'MLSNEXT';
SELECT count(*) AS va_entries    FROM bracket_entries    WHERE challenge_id = 'va26-u13-ad';
SELECT count(*) AS va_results    FROM bracket_results    WHERE challenge_id = 'va26-u13-ad';
SELECT count(*) AS va_challenge  FROM bracket_challenges WHERE id = 'va26-u13-ad';

-- ── Step 2 — Safety check: any real bets on these games? (read-only) ────────
-- games → parlay_games has NO cascade delete, and silently removing a leg
-- corrupts that parlay's num_games / multiplier.
--
-- If this returns 0 rows, Step 3 is safe as written.
-- If it returns any PENDING parlay: void + refund it first (credit bet_amount
-- back to the user's wallet_balance, set the parlay to CANCELLED) before
-- proceeding — do not just delete a live ticket's legs.
SELECT p.id AS parlay_id, p.status, count(*) AS affected_legs
FROM parlay_games pg
JOIN parlays p ON p.id = pg.parlay_id
WHERE pg.game_id IN (
  SELECT id FROM games
  WHERE external_id LIKE 'wc26-%'    OR sport = 'WORLD_CUP'
     OR external_id LIKE 'mlsnext-%' OR sport = 'MLSNEXT'
)
GROUP BY p.id, p.status;

-- ── Step 3 — Delete (single transaction) ────────────────────────────────────
-- ONLY proceed after Step 2 came back clean (or affected parlays were
-- voided + refunded).
BEGIN;

-- 1. Detach parlay legs on these games
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
--    but delete explicitly so it works even if the challenge row is gone).
--    `npx prisma db push` will drop these three tables afterwards anyway;
--    deleting the rows here keeps the window where the tables still exist
--    consistent, and makes the purge complete even if db push is deferred.
DELETE FROM bracket_entries    WHERE challenge_id = 'va26-u13-ad';
DELETE FROM bracket_results    WHERE challenge_id = 'va26-u13-ad';
DELETE FROM bracket_challenges WHERE id = 'va26-u13-ad';

COMMIT;

-- ── Step 4 — Confirm (re-run Step 1; every count should be 0) ───────────────
SELECT count(*) AS wc_games      FROM games WHERE external_id LIKE 'wc26-%'   OR sport = 'WORLD_CUP';
SELECT count(*) AS mlsnext_games FROM games WHERE external_id LIKE 'mlsnext-%' OR sport = 'MLSNEXT';
SELECT count(*) AS va_entries    FROM bracket_entries    WHERE challenge_id = 'va26-u13-ad';
SELECT count(*) AS va_results    FROM bracket_results    WHERE challenge_id = 'va26-u13-ad';
SELECT count(*) AS va_challenge  FROM bracket_challenges WHERE id = 'va26-u13-ad';

-- ── After this purge ────────────────────────────────────────────────────────
-- Run:  npx prisma db push --accept-data-loss
-- (drops the now-empty bracket_challenges / bracket_entries / bracket_results
-- tables to match the new schema; there is no prisma/migrations history in
-- this repo — it is gitignored — so db push is the schema-sync mechanism.)
