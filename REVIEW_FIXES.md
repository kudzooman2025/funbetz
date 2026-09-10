# Review fixes

- Wallet replenishment locks the user's row before checking the balance and pending tickets. Bet placement and settlement already update the same row in their transactions.
- New PGA/LIV wagers are paused in both the schedule and placement API until verified results are available. Existing tickets are not automatically changed or refunded.
- ESPN temporary delays and suspensions remain nonterminal; actual postponements retain the existing push rule.
- Pending tickets refresh against their original provider and season, including legacy SportsDB IDs. Keep CFBD credentials available until CFBD tickets settle, even after changing the preferred provider. Missing original results are reported in sync errors.
- Registration and invitations store normalized email addresses. Login and recovery support mixed-case legacy addresses and reject ambiguous matches without merging accounts.
- League dates use UTC and include the full final day. Both scoring and shared cards use the same exclusive next-midnight boundary, including existing league records. The UI uses the same calendar dates and boundary.
- Email client initialization is deferred until sending so builds can complete without an email API key; sending still requires the key.

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build`.
The wallet regression harness tests concurrent request interleavings in memory; real PostgreSQL concurrency has not been integration-tested.

Run `npm run audit:review` with the intended database environment loaded for a read-only audit of pending golf tickets and case-insensitive email collisions. For a local `.env`, use `node --env-file=.env --import tsx scripts/audit-review-data.ts`.
The configured database audit on September 9, 2026 found neither pending golf tickets nor email collisions. No database records were changed.
