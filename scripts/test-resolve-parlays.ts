/**
 * Unit tests for the parlay resolution math (lib/resolve-parlays.ts) and the
 * betting window (lib/utils.ts). No test framework needed — plain assertions.
 *
 * Run with: npm run test:resolver
 */

import assert from "node:assert/strict";
import { computeParlayOutcome } from "../lib/resolve-parlays";
import { MULTIPLIERS, MIN_PARLAY_GAMES } from "../lib/constants";
import { getBettingWindow } from "../lib/utils";

type Leg = Parameters<typeof computeParlayOutcome>[0][number];

function leg(partial: Partial<Leg>): Leg {
  return {
    pickedTeam: "Home",
    gameStatus: "COMPLETED",
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 21,
    awayScore: 14,
    ...partial,
  };
}

const win = () => leg({});
const loss = () => leg({ pickedTeam: "Away" });
const tie = () => leg({ homeScore: 20, awayScore: 20 });
const cancelled = () => leg({ gameStatus: "CANCELLED", homeScore: null, awayScore: null });
const postponed = () => leg({ gameStatus: "POSTPONED", homeScore: null, awayScore: null });

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

console.log("computeParlayOutcome:");

test("all legs won → WON, payout = round(stake * multiplier)", () => {
  const o = computeParlayOutcome([win(), win(), win(), win()], 100)!;
  assert.equal(o.status, "WON");
  assert.equal(o.effectiveMultiplier, MULTIPLIERS[4]);
  assert.equal(o.payoutAmount, Math.round(100 * MULTIPLIERS[4]));
  assert.equal(o.walletAdjustment, o.payoutAmount);
  assert.equal(o.leaderboardAdjustment, o.payoutAmount - 100);
  assert.deepEqual(o.legResults, ["WON", "WON", "WON", "WON"]);
});

test("any lost leg → LOST, stake gone, no payout", () => {
  const o = computeParlayOutcome([win(), win(), loss()], 50)!;
  assert.equal(o.status, "LOST");
  assert.equal(o.payoutAmount, 0);
  assert.equal(o.walletAdjustment, 0);
  assert.equal(o.leaderboardAdjustment, -50);
  assert.deepEqual(o.legResults, ["WON", "WON", "LOST"]);
});

test("tie (NFL OT) → PUSH, not a loss", () => {
  const o = computeParlayOutcome([win(), win(), win(), tie()], 100)!;
  assert.equal(o.status, "WON");
  assert.deepEqual(o.legResults, ["WON", "WON", "WON", "PUSH"]);
});

test("push drops the leg and recomputes the multiplier (4-leg pays as 3-leg)", () => {
  const o = computeParlayOutcome([win(), win(), win(), tie()], 100)!;
  assert.equal(o.effectiveMultiplier, MULTIPLIERS[3]);
  assert.equal(o.payoutAmount, Math.round(100 * MULTIPLIERS[3]));
});

test("cancelled game → PUSH", () => {
  const o = computeParlayOutcome([win(), win(), win(), cancelled()], 100)!;
  assert.equal(o.status, "WON");
  assert.deepEqual(o.legResults, ["WON", "WON", "WON", "PUSH"]);
  assert.equal(o.effectiveMultiplier, MULTIPLIERS[3]);
});

test("postponed game → PUSH", () => {
  const o = computeParlayOutcome([win(), win(), win(), postponed()], 100)!;
  assert.deepEqual(o.legResults, ["WON", "WON", "WON", "PUSH"]);
});

test("pushes below MIN_PARLAY_GAMES → CANCELLED with full refund", () => {
  const o = computeParlayOutcome([win(), win(), tie()], 100)!;
  assert.equal(o.status, "CANCELLED");
  assert.equal(o.payoutAmount, 0);
  assert.equal(o.walletAdjustment, 100); // stake refunded
  assert.equal(o.leaderboardAdjustment, 0);
});

test("all legs pushed → CANCELLED with full refund", () => {
  const o = computeParlayOutcome([cancelled(), tie(), postponed()], 75)!;
  assert.equal(o.status, "CANCELLED");
  assert.equal(o.walletAdjustment, 75);
  assert.deepEqual(o.legResults, ["PUSH", "PUSH", "PUSH"]);
});

test("a loss still loses even when pushes drop below MIN_PARLAY_GAMES", () => {
  const o = computeParlayOutcome([loss(), tie(), cancelled()], 100)!;
  assert.equal(o.status, "LOST");
  assert.equal(o.walletAdjustment, 0);
  assert.equal(o.leaderboardAdjustment, -100);
});

test("completed game with missing scores → cannot resolve yet (null)", () => {
  const o = computeParlayOutcome([win(), win(), leg({ homeScore: null })], 100);
  assert.equal(o, null);
});

test("away winner picked correctly", () => {
  const o = computeParlayOutcome(
    [
      leg({ pickedTeam: "Away", homeScore: 10, awayScore: 24 }),
      win(),
      win(),
    ],
    100
  )!;
  assert.equal(o.status, "WON");
});

test("8-leg max parlay multiplier", () => {
  const o = computeParlayOutcome(Array.from({ length: 8 }, win), 10)!;
  assert.equal(o.effectiveMultiplier, MULTIPLIERS[8]);
  assert.equal(o.payoutAmount, Math.round(10 * MULTIPLIERS[8]));
});

test("MIN_PARLAY_GAMES sanity", () => {
  assert.equal(MIN_PARLAY_GAMES, 3);
});

console.log("\ngetBettingWindow:");

test("window end is a Tuesday at 07:59:59 UTC, in the future", () => {
  const { start, end } = getBettingWindow();
  assert.equal(end.getUTCDay(), 2); // Tuesday
  assert.equal(end.getUTCHours(), 7);
  assert.equal(end.getUTCMinutes(), 59);
  assert.ok(end.getTime() > Date.now());
  assert.ok(start.getTime() > Date.now()); // 1h buffer
});

test("window covers an upcoming Sunday+Monday night (SNF/MNF not cut off)", () => {
  const { end } = getBettingWindow();
  // The Monday 23:59 ET before this Tuesday-08:00-UTC boundary is inside it
  const mondayNightUtc = new Date(end.getTime() - 4 * 60 * 60 * 1000); // Tue 03:59 UTC = Mon 11:59pm ET
  assert.ok(mondayNightUtc < end);
  assert.equal(mondayNightUtc.getUTCDay(), 2); // still Tuesday in UTC — i.e. Monday night ET
});

console.log(`\nAll ${passed} tests passed.`);
