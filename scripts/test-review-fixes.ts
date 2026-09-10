import assert from "node:assert/strict";
import { parseLeagueDate, leagueEndExclusive } from "../lib/league-dates";
import { normalizeEmail, findUserByEmail } from "../lib/account-email";
import { registerSchema } from "../lib/validators";
import { isSportBettable } from "../lib/betting-availability";
import { espnStatus, type NormalizedGame } from "../lib/espn-source";
import { gameSource, originalSeasonLookup } from "../lib/game-source";
import { resolvePendingParlays } from "../lib/resolve-parlays";
import { replenishWallet } from "../lib/wallet";
import type { PrismaClient } from "../generated/prisma/client";

async function main() {
  for (const status of ["STATUS_DELAYED", "STATUS_SUSPENDED"]) {
    assert.equal(espnStatus(status, "in", false), "IN_PROGRESS");
  }
  assert.equal(espnStatus("STATUS_POSTPONED"), "POSTPONED");
  assert.equal(espnStatus("STATUS_FINAL", "post", true), "COMPLETED");
  const delayedDb = {
    parlay: { findMany: async () => [{ parlayGames: [{ game: {
      status: espnStatus("STATUS_DELAYED"), scheduledStart: new Date(0), homeScore: 10, awayScore: 7,
    } }] }] },
    $transaction: async () => { assert.fail("A temporarily delayed game must not settle"); },
  } as unknown as PrismaClient;
  assert.equal((await resolvePendingParlays(delayedDb)).resolved, 0);
  assert.equal(isSportBettable("PGA"), false);
  assert.equal(isSportBettable("LIV"), false);
  assert.equal(isSportBettable("NFL"), true);

  for (const day of ["2026-03-08", "2026-11-01", "2026-12-31", "2028-02-29"]) {
    const start = parseLeagueDate(day);
    const end = leagueEndExclusive(start);
    assert.equal(end.getTime() - start.getTime(), 86_400_000);
    assert.ok(new Date(`${day}T23:59:59.999Z`) < end);
    assert.equal(end.getUTCHours(), 0);
  }
  for (const invalid of ["2026-02-30", "2026-02-29", "09/09/2026", "2026-09-09T00:00:00Z", null]) {
    assert.ok(Number.isNaN(parseLeagueDate(invalid).getTime()));
  }
  assert.equal(leagueEndExclusive(new Date("2026-09-09T00:00:00Z")).toISOString(), "2026-09-10T00:00:00.000Z");

  assert.equal(normalizeEmail(" Name@Example.com "), "name@example.com");
  assert.equal(registerSchema.parse({ email: " Name@Example.com ", username: "tester", password: "test-password" }).email, "name@example.com");
  const rows = [{ id: "legacy", email: "Name@Example.com" }];
  const emailDb = { user: { findMany: async (query: unknown) => {
    assert.deepEqual(query, { where: { email: { equals: "name@example.com", mode: "insensitive" } }, take: 2 });
    return rows;
  } } } as unknown as PrismaClient;
  assert.equal((await findUserByEmail(emailDb, " NAME@example.com "))?.id, "legacy");
  rows.push({ id: "collision", email: "name@example.com" });
  assert.equal(await findUserByEmail(emailDb, "name@example.com"), null);

  assert.equal(gameSource("espn-cfb-123"), "espn-cfb");
  assert.equal(gameSource("cfbd-123"), "cfbd");
  assert.equal(gameSource("espn-nfl-123"), "espn-nfl");
  assert.equal(gameSource("123"), "sportsdb");
  assert.equal(gameSource("pga26-masters-r1-01"), null);
  const calls: string[] = [];
  const lookup = originalSeasonLookup(async (source, year) => {
    calls.push(`${source}:${year}`);
    return [{ externalId: `${source}-123`, homeScore: 24, awayScore: 17, status: "COMPLETED" } as NormalizedGame];
  });
  const original = { externalId: "espn-cfb-123", season: "2025", scheduledStart: new Date("2026-01-01") };
  assert.equal((await lookup(original))?.homeScore, 24);
  await lookup(original);
  assert.equal((await lookup({ ...original, externalId: "cfbd-123" }))?.homeScore, 24);
  assert.deepEqual(calls, ["espn-cfb:2025", "cfbd:2025"]);

  // In-memory transaction harness models PostgreSQL's row-lock queue. It
  // exercises interleavings; it does not replace a PostgreSQL integration test.
  let balance = 0;
  let pending = 0;
  let queue: Promise<void> = Promise.resolve();
  function transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = queue;
    queue = new Promise<void>((resolve) => { release = resolve; });
    return previous.then(async () => {
      let locked = false;
      try {
        return await fn({
          $queryRaw: async (sql: TemplateStringsArray) => {
            assert.match(sql.join("?"), /FOR UPDATE/);
            locked = true;
            return [{ wallet_balance: balance }];
          },
          parlay: { count: async () => { assert.ok(locked); return pending; } },
          user: { update: async ({ data }: { data: { walletBalance: number } }) => {
            assert.ok(locked);
            balance = data.walletBalance;
          } },
        });
      } finally { release(); }
    });
  }
  const walletDb = { $transaction: transaction } as unknown as PrismaClient;
  const concurrent = await Promise.allSettled([
    replenishWallet(walletDb, "user", 1000), replenishWallet(walletDb, "user", 1000),
  ]);
  assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(balance, 1000);

  balance = 0;
  const refill = replenishWallet(walletDb, "user", 1000);
  const bet = transaction(async () => { balance -= 1000; pending++; });
  const lateRefill = replenishWallet(walletDb, "user", 1000);
  const interleaved = await Promise.allSettled([refill, bet, lateRefill]);
  assert.equal(interleaved[2].status, "rejected");
  assert.equal(balance, 0);
  assert.equal(pending, 1);
  console.log("Review regression checks passed (delays, golf gate, dates, email, sources, wallet interleavings).");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
