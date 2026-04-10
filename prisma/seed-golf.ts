/**
 * Golf seed — 2026 PGA Tour + LIV Golf round-leader matchups
 * Run: npx tsx prisma/seed-golf.ts
 *
 * Format: each "game" = Player A vs Player B for a specific round.
 * The player who scores lower in that round wins the matchup.
 *
 * Today is April 10, 2026 (Friday):
 *   Masters R1 (Thu Apr 9)  → COMPLETED
 *   Masters R2 (Fri Apr 10) → IN_PROGRESS (today)
 *   Masters R3 (Sat Apr 11) → SCHEDULED ← bettable ✓
 *   Masters R4 (Sun Apr 12) → SCHEDULED ← bettable ✓
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── helpers ────────────────────────────────────────────────────────────────────

/** UTC date string → Date */
const d = (iso: string) => new Date(iso);

interface MatchupRow {
  externalId: string;
  sport: "PGA" | "LIV";
  league: string; // tournament name
  homeTeam: string;
  awayTeam: string;
  scheduledStart: Date;
  round: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  season: string;
}

async function upsertMatchup(m: MatchupRow) {
  await prisma.$executeRaw`
    INSERT INTO games (
      id, external_id, sport, league,
      home_team, away_team,
      scheduled_start, round, season, status,
      created_at, updated_at
    ) VALUES (
      ${randomUUID()}, ${m.externalId}, ${m.sport}::"Sport", ${m.league},
      ${m.homeTeam}, ${m.awayTeam},
      ${m.scheduledStart}, ${m.round}, ${m.season}, ${m.status}::"GameStatus",
      NOW(), NOW()
    )
    ON CONFLICT (external_id) DO UPDATE SET
      status       = EXCLUDED.status,
      updated_at   = NOW()
  `;
}

// ── Matchup definitions ────────────────────────────────────────────────────────

const MASTERS_2026: Omit<MatchupRow, "externalId" | "round" | "scheduledStart" | "status">[] = [
  { sport: "PGA", league: "The Masters 2026", homeTeam: "Scottie Scheffler",   awayTeam: "Rory McIlroy",       season: "2025-2026" },
  { sport: "PGA", league: "The Masters 2026", homeTeam: "Xander Schauffele",   awayTeam: "Jon Rahm",           season: "2025-2026" },
  { sport: "PGA", league: "The Masters 2026", homeTeam: "Collin Morikawa",     awayTeam: "Viktor Hovland",     season: "2025-2026" },
  { sport: "PGA", league: "The Masters 2026", homeTeam: "Ludvig Åberg",        awayTeam: "Tommy Fleetwood",    season: "2025-2026" },
  { sport: "PGA", league: "The Masters 2026", homeTeam: "Shane Lowry",         awayTeam: "Justin Thomas",      season: "2025-2026" },
  { sport: "PGA", league: "The Masters 2026", homeTeam: "Jordan Spieth",       awayTeam: "Patrick Cantlay",    season: "2025-2026" },
];

// R1=Thu Apr 9 12:00 UTC, R2=Fri Apr 10 12:00 UTC, R3=Sat Apr 11 12:00 UTC, R4=Sun Apr 12 12:00 UTC
const MASTERS_ROUNDS: { round: number; start: Date; status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" }[] = [
  { round: 1, start: d("2026-04-09T12:00:00Z"), status: "COMPLETED" },
  { round: 2, start: d("2026-04-10T12:00:00Z"), status: "IN_PROGRESS" },
  { round: 3, start: d("2026-04-11T12:00:00Z"), status: "SCHEDULED" },
  { round: 4, start: d("2026-04-12T12:00:00Z"), status: "SCHEDULED" },
];

const RBC_HERITAGE_2026: Omit<MatchupRow, "externalId" | "round" | "scheduledStart" | "status">[] = [
  { sport: "PGA", league: "RBC Heritage 2026",  homeTeam: "Xander Schauffele",   awayTeam: "Wyndham Clark",    season: "2025-2026" },
  { sport: "PGA", league: "RBC Heritage 2026",  homeTeam: "Brian Harman",        awayTeam: "Russell Henley",   season: "2025-2026" },
  { sport: "PGA", league: "RBC Heritage 2026",  homeTeam: "Cameron Young",       awayTeam: "Tom Kim",          season: "2025-2026" },
  { sport: "PGA", league: "RBC Heritage 2026",  homeTeam: "Matt Fitzpatrick",    awayTeam: "Keegan Bradley",   season: "2025-2026" },
  { sport: "PGA", league: "RBC Heritage 2026",  homeTeam: "Chris Kirk",          awayTeam: "Denny McCarthy",   season: "2025-2026" },
  { sport: "PGA", league: "RBC Heritage 2026",  homeTeam: "Sepp Straka",         awayTeam: "Nick Taylor",      season: "2025-2026" },
];

// R1=Thu Apr 16, R2=Fri Apr 17, R3=Sat Apr 18, R4=Sun Apr 19
const RBC_ROUNDS: { round: number; start: Date; status: "SCHEDULED" }[] = [
  { round: 1, start: d("2026-04-16T12:00:00Z"), status: "SCHEDULED" },
  { round: 2, start: d("2026-04-17T12:00:00Z"), status: "SCHEDULED" },
  { round: 3, start: d("2026-04-18T12:00:00Z"), status: "SCHEDULED" },
  { round: 4, start: d("2026-04-19T12:00:00Z"), status: "SCHEDULED" },
];

// LIV Golf — Houston 2026 (3 rounds, Fri-Sun)
const LIV_HOUSTON_2026: Omit<MatchupRow, "externalId" | "round" | "scheduledStart" | "status">[] = [
  { sport: "LIV", league: "LIV Golf Houston 2026", homeTeam: "Bryson DeChambeau", awayTeam: "Brooks Koepka",     season: "2026" },
  { sport: "LIV", league: "LIV Golf Houston 2026", homeTeam: "Joaquín Niemann",   awayTeam: "Cameron Smith",     season: "2026" },
  { sport: "LIV", league: "LIV Golf Houston 2026", homeTeam: "Dustin Johnson",    awayTeam: "Talor Gooch",       season: "2026" },
  { sport: "LIV", league: "LIV Golf Houston 2026", homeTeam: "Phil Mickelson",    awayTeam: "Patrick Reed",      season: "2026" },
  { sport: "LIV", league: "LIV Golf Houston 2026", homeTeam: "Harold Varner III", awayTeam: "Bubba Watson",      season: "2026" },
];

// R1=Fri Apr 17, R2=Sat Apr 18, R3=Sun Apr 19
const LIV_ROUNDS: { round: number; start: Date; status: "SCHEDULED" }[] = [
  { round: 1, start: d("2026-04-17T17:00:00Z"), status: "SCHEDULED" },
  { round: 2, start: d("2026-04-18T17:00:00Z"), status: "SCHEDULED" },
  { round: 3, start: d("2026-04-19T17:00:00Z"), status: "SCHEDULED" },
];

// Zurich Classic (PGA team event, pairs format) — Apr 23-26
const ZURICH_2026: Omit<MatchupRow, "externalId" | "round" | "scheduledStart" | "status">[] = [
  { sport: "PGA", league: "Zurich Classic 2026", homeTeam: "McIlroy / Lowry",      awayTeam: "Scheffler / Cantlay",  season: "2025-2026" },
  { sport: "PGA", league: "Zurich Classic 2026", homeTeam: "Morikawa / Fleetwood", awayTeam: "Hovland / Åberg",      season: "2025-2026" },
  { sport: "PGA", league: "Zurich Classic 2026", homeTeam: "Spieth / Thomas",      awayTeam: "Schauffele / Burns",   season: "2025-2026" },
  { sport: "PGA", league: "Zurich Classic 2026", homeTeam: "Young / Homa",         awayTeam: "Kim / An",             season: "2025-2026" },
];

const ZURICH_ROUNDS: { round: number; start: Date; status: "SCHEDULED" }[] = [
  { round: 1, start: d("2026-04-23T17:00:00Z"), status: "SCHEDULED" },
  { round: 2, start: d("2026-04-24T17:00:00Z"), status: "SCHEDULED" },
  { round: 3, start: d("2026-04-25T17:00:00Z"), status: "SCHEDULED" },
  { round: 4, start: d("2026-04-26T17:00:00Z"), status: "SCHEDULED" },
];

// ── Build all rows ─────────────────────────────────────────────────────────────

function buildRows(
  matchups: Omit<MatchupRow, "externalId" | "round" | "scheduledStart" | "status">[],
  rounds: { round: number; start: Date; status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" }[],
  prefix: string
): MatchupRow[] {
  const rows: MatchupRow[] = [];
  for (const r of rounds) {
    matchups.forEach((m, i) => {
      rows.push({
        ...m,
        externalId: `${prefix}-r${r.round}-${String(i + 1).padStart(2, "0")}`,
        round: r.round,
        scheduledStart: r.start,
        status: r.status,
      });
    });
  }
  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const allRows: MatchupRow[] = [
    ...buildRows(MASTERS_2026,       MASTERS_ROUNDS, "pga26-masters"),
    ...buildRows(RBC_HERITAGE_2026,  RBC_ROUNDS,     "pga26-rbc"),
    ...buildRows(LIV_HOUSTON_2026,   LIV_ROUNDS,     "liv26-hou"),
    ...buildRows(ZURICH_2026,        ZURICH_ROUNDS,  "pga26-zurich"),
  ];

  let seeded = 0;
  for (const row of allRows) {
    await upsertMatchup(row);
    seeded++;
    if (seeded % 10 === 0) process.stdout.write(`  ${seeded}/${allRows.length}\r`);
  }

  console.log(`\nGolf seed complete: ${seeded} matchups`);
  console.log("  The Masters 2026:", MASTERS_2026.length * MASTERS_ROUNDS.length, "games");
  console.log("  RBC Heritage 2026:", RBC_HERITAGE_2026.length * RBC_ROUNDS.length, "games");
  console.log("  LIV Golf Houston 2026:", LIV_HOUSTON_2026.length * LIV_ROUNDS.length, "games");
  console.log("  Zurich Classic 2026:", ZURICH_2026.length * ZURICH_ROUNDS.length, "games");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
