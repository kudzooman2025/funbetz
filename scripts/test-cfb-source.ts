/**
 * Unit tests for the schedule provider mappers (lib/espn-source.ts and
 * lib/cfb-source.ts). Pure functions only — no network access.
 *
 * Run with: npm run test:cfb
 */

import assert from "node:assert/strict";
import {
  normalizeEspnEvent,
  espnRound,
  POSTSEASON_ROUND_OFFSET,
  PRESEASON_ROUND_OFFSET,
  type EspnEvent,
} from "../lib/espn-source";
import { normalizeCfbdRow } from "../lib/cfb-source";

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

// ── ESPN fixtures (shape taken from the live scoreboard payload) ────────────

function espnEvent(overrides: Partial<EspnEvent> = {}): EspnEvent {
  return {
    id: "401752000",
    date: "2026-08-29T16:00Z",
    competitions: [
      {
        competitors: [
          {
            homeAway: "home",
            score: "0",
            team: { displayName: "TCU Horned Frogs", logo: "https://a.espncdn.com/tcu.png" },
          },
          {
            homeAway: "away",
            score: "0",
            team: { displayName: "North Carolina Tar Heels", logo: "https://a.espncdn.com/unc.png" },
          },
        ],
        status: { type: { state: "pre", completed: false, name: "STATUS_SCHEDULED" } },
      },
    ],
    ...overrides,
  };
}

console.log("normalizeEspnEvent:");

test("maps a scheduled FBS game with home/away in the right slots", () => {
  const g = normalizeEspnEvent(espnEvent(), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(g.externalId, "espn-cfb-401752000");
  assert.equal(g.homeTeam, "TCU Horned Frogs");
  assert.equal(g.awayTeam, "North Carolina Tar Heels");
  assert.equal(g.status, "SCHEDULED");
  assert.equal(g.round, 1);
});

test("parses the kickoff as UTC (no server-local drift)", () => {
  const g = normalizeEspnEvent(espnEvent(), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(g.scheduledStart.toISOString(), "2026-08-29T16:00:00.000Z");
});

test("carries team logos through as badges", () => {
  const g = normalizeEspnEvent(espnEvent(), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(g.homeTeamBadge, "https://a.espncdn.com/tcu.png");
  assert.equal(g.awayTeamBadge, "https://a.espncdn.com/unc.png");
});

test("final score + completed state maps to COMPLETED with scores", () => {
  const g = normalizeEspnEvent(espnEvent({
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "24", team: { displayName: "TCU Horned Frogs" } },
            { homeAway: "away", score: "17", team: { displayName: "North Carolina Tar Heels" } },
          ],
          status: { type: { state: "post", completed: true, name: "STATUS_FINAL" } },
        },
      ],
    }), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(g.status, "COMPLETED");
  assert.equal(g.homeScore, 24);
  assert.equal(g.awayScore, 17);
});

test("in-progress game maps to IN_PROGRESS", () => {
  const g = normalizeEspnEvent(espnEvent({
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "7", team: { displayName: "A" } },
            { homeAway: "away", score: "3", team: { displayName: "B" } },
          ],
          status: { type: { state: "in", completed: false, name: "STATUS_IN_PROGRESS" } },
        },
      ],
    }), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(g.status, "IN_PROGRESS");
});

test("postponed and cancelled map to PUSH-able statuses", () => {
  const postponed = normalizeEspnEvent(espnEvent({
      competitions: [
        {
          competitors: [
            { homeAway: "home", team: { displayName: "A" } },
            { homeAway: "away", team: { displayName: "B" } },
          ],
          status: { type: { state: "pre", completed: false, name: "STATUS_POSTPONED" } },
        },
      ],
    }), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(postponed.status, "POSTPONED");

  const cancelled = normalizeEspnEvent(espnEvent({
      competitions: [
        {
          competitors: [
            { homeAway: "home", team: { displayName: "A" } },
            { homeAway: "away", team: { displayName: "B" } },
          ],
          status: { type: { state: "pre", completed: false, name: "STATUS_CANCELED" } },
        },
      ],
    }), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(cancelled.status, "CANCELLED");
});

test("bowl/playoff games get the postseason round offset", () => {
  const g = normalizeEspnEvent(espnEvent(), "espn-cfb-", espnRound(3, 1))!;
  assert.equal(g.round, POSTSEASON_ROUND_OFFSET + 1);
});

test("missing scores stay null rather than becoming 0", () => {
  const g = normalizeEspnEvent(espnEvent({
      competitions: [
        {
          competitors: [
            { homeAway: "home", team: { displayName: "A" } },
            { homeAway: "away", team: { displayName: "B" } },
          ],
          status: { type: { state: "pre" } },
        },
      ],
    }), "espn-cfb-", espnRound(2, 1))!;
  assert.equal(g.homeScore, null);
  assert.equal(g.awayScore, null);
});

test("malformed events are skipped, not half-imported", () => {
  assert.equal(normalizeEspnEvent({ id: "1" }, "espn-cfb-", espnRound(2, 1)), null);
  assert.equal(normalizeEspnEvent({ ...espnEvent(), date: undefined }, "espn-cfb-", espnRound(2, 1)), null);
  assert.equal(normalizeEspnEvent({ ...espnEvent(), competitions: [] }, "espn-cfb-", espnRound(2, 1)), null);
});

// ── CFBD fixtures ──────────────────────────────────────────────────────────

console.log("\nnormalizeCfbdRow:");

test("reads v2 camelCase payloads", () => {
  const g = normalizeCfbdRow(
    {
      id: 401752000,
      week: 3,
      startDate: "2026-09-12T23:30:00.000Z",
      homeTeam: "Ohio State",
      awayTeam: "Texas",
      completed: false,
    },
    "regular"
  )!;
  assert.equal(g.externalId, "cfbd-401752000");
  assert.equal(g.homeTeam, "Ohio State");
  assert.equal(g.round, 3);
  assert.equal(g.status, "SCHEDULED");
  assert.equal(g.scheduledStart.toISOString(), "2026-09-12T23:30:00.000Z");
});

test("reads v1 snake_case payloads identically", () => {
  const g = normalizeCfbdRow(
    {
      id: 5,
      week: 3,
      start_date: "2026-09-12T23:30:00.000Z",
      home_team: "Ohio State",
      away_team: "Texas",
      home_points: 31,
      away_points: 28,
      completed: true,
    },
    "regular"
  )!;
  assert.equal(g.homeTeam, "Ohio State");
  assert.equal(g.homeScore, 31);
  assert.equal(g.awayScore, 28);
  assert.equal(g.status, "COMPLETED");
});

test("attaches logos from the team map when available", () => {
  const logos = new Map([["Ohio State", "https://cfbd/osu.png"]]);
  const g = normalizeCfbdRow(
    { id: 1, week: 1, startDate: "2026-09-05T16:00:00.000Z", homeTeam: "Ohio State", awayTeam: "Texas" },
    "regular",
    logos
  )!;
  assert.equal(g.homeTeamBadge, "https://cfbd/osu.png");
  assert.equal(g.awayTeamBadge, null);
});

test("postseason rows get the offset so bowls don't collide with week numbers", () => {
  const g = normalizeCfbdRow(
    { id: 9, week: 1, startDate: "2026-12-20T16:00:00.000Z", homeTeam: "A", awayTeam: "B" },
    "postseason"
  )!;
  assert.equal(g.round, POSTSEASON_ROUND_OFFSET + 1);
});

test("incomplete rows are skipped", () => {
  assert.equal(normalizeCfbdRow({ id: 1, week: 1 }, "regular"), null);
  assert.equal(
    normalizeCfbdRow({ week: 1, startDate: "2026-09-05T16:00:00.000Z", homeTeam: "A", awayTeam: "B" }, "regular"),
    null
  );
});

// ── round-number banding (shared by NFL + college football) ────────────────

console.log("\nespnRound banding:");

test("regular-season weeks stay as plain week numbers", () => {
  assert.equal(espnRound(2, 1), 1);
  assert.equal(espnRound(2, 18), 18);
});

test("preseason weeks land in the 500 band", () => {
  assert.equal(espnRound(1, 1), PRESEASON_ROUND_OFFSET + 1);
  assert.equal(espnRound(1, 4), PRESEASON_ROUND_OFFSET + 4);
});

test("postseason weeks land in the 100 band", () => {
  assert.equal(espnRound(3, 1), POSTSEASON_ROUND_OFFSET + 1);
  assert.equal(espnRound(3, 5), POSTSEASON_ROUND_OFFSET + 5);
});

test("the three bands never collide", () => {
  const regular = [1, 18].map((w) => espnRound(2, w));
  const post = [1, 5].map((w) => espnRound(3, w));
  const pre = [1, 4].map((w) => espnRound(1, w));
  const all = [...regular, ...post, ...pre];
  assert.equal(new Set(all).size, all.length);
  assert.ok(Math.max(...regular) < Math.min(...post));
  assert.ok(Math.max(...post) < Math.min(...pre));
});

test("NFL events carry the NFL prefix, keeping IDs distinct per league", () => {
  const g = normalizeEspnEvent(espnEvent(), "espn-nfl-", espnRound(1, 1))!;
  assert.equal(g.externalId, "espn-nfl-401752000");
  assert.equal(g.round, PRESEASON_ROUND_OFFSET + 1);
});

console.log(`\nAll ${passed} tests passed.`);
