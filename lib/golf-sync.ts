/**
 * Golf Auto-Sync
 *
 * Automatically generates round-leader matchup games for upcoming PGA Tour
 * and LIV Golf tournaments. Runs weekly (Mondays) via Vercel Cron.
 *
 * - PGA Tour: uses a hardcoded 2026 season schedule
 * - LIV Golf: uses a hardcoded 2026 season schedule
 *
 * For each upcoming tournament (within the next 21 days) that hasn't been
 * seeded yet, it generates matchup rows from fixed rivalry pairs.
 */

import { prisma } from "./prisma";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Fixed rivalry pairs
// ─────────────────────────────────────────────────────────────────────────────

const PGA_PAIRS: [string, string][] = [
  ["Scottie Scheffler", "Rory McIlroy"],
  ["Xander Schauffele", "Jon Rahm"],
  ["Collin Morikawa", "Viktor Hovland"],
  ["Ludvig Åberg", "Tommy Fleetwood"],
  ["Shane Lowry", "Justin Thomas"],
  ["Jordan Spieth", "Patrick Cantlay"],
];

const LIV_PAIRS: [string, string][] = [
  ["Bryson DeChambeau", "Brooks Koepka"],
  ["Joaquín Niemann", "Cameron Smith"],
  ["Dustin Johnson", "Talor Gooch"],
  ["Phil Mickelson", "Patrick Reed"],
  ["Harold Varner III", "Bubba Watson"],
];

// Zurich Classic uses team pairs (partner golf) — override pairs for that event
const ZURICH_PAIRS: [string, string][] = [
  ["McIlroy / Lowry", "Scheffler / Cantlay"],
  ["Morikawa / Fleetwood", "Hovland / Åberg"],
  ["Spieth / Thomas", "Schauffele / Burns"],
  ["Young / Homa", "Kim / An"],
];

// ─────────────────────────────────────────────────────────────────────────────
// Tournament schedule definitions
// ─────────────────────────────────────────────────────────────────────────────

interface GolfTournamentDef {
  /** Short unique prefix used to build externalId, e.g. "pga26-masters" */
  id: string;
  sport: "PGA" | "LIV";
  name: string;
  season: string;
  rounds: number;
  /** ISO date of Round 1 tee-off, UTC */
  r1Start: Date;
  /** Hours between consecutive rounds (typically 24) */
  hoursPerRound: number;
  /** Player rivalry pairs for this tournament */
  pairs: [string, string][];
}

const d = (iso: string) => new Date(iso);

// PGA Tour 2025-2026 schedule (April 2026 onward, majors + marquee events)
// Already seeded manually: Masters R1-R4, RBC Heritage R1-R4, LIV Houston R1-R3, Zurich R1-R4
// The sync job skips any tournament whose games already exist in the DB.
const GOLF_SCHEDULE_2026: GolfTournamentDef[] = [
  // ── April ─────────────────────────────────────────────────────────────────
  {
    id: "pga26-masters",
    sport: "PGA",
    name: "The Masters 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-04-09T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "pga26-rbc",
    sport: "PGA",
    name: "RBC Heritage 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-04-16T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "liv26-hou",
    sport: "LIV",
    name: "LIV Golf Houston 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-04-17T17:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  {
    id: "pga26-zurich",
    sport: "PGA",
    name: "Zurich Classic 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-04-23T17:00:00Z"),
    hoursPerRound: 24,
    pairs: ZURICH_PAIRS,
  },
  // ── May ───────────────────────────────────────────────────────────────────
  {
    id: "liv26-jed",
    sport: "LIV",
    name: "LIV Golf Jeddah 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-05-01T14:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  {
    id: "pga26-wells",
    sport: "PGA",
    name: "Wells Fargo Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-05-07T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "liv26-hk",
    sport: "LIV",
    name: "LIV Golf Hong Kong 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-05-08T04:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  {
    id: "pga26-pgachamp",
    sport: "PGA",
    name: "PGA Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-05-14T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "pga26-schwab",
    sport: "PGA",
    name: "Charles Schwab Challenge 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-05-21T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "liv26-and",
    sport: "LIV",
    name: "LIV Golf Andalucia 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-05-29T11:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  {
    id: "pga26-memorial",
    sport: "PGA",
    name: "Memorial Tournament 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-05-28T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  // ── June ──────────────────────────────────────────────────────────────────
  {
    id: "liv26-nash",
    sport: "LIV",
    name: "LIV Golf Nashville 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-06-05T17:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  {
    id: "pga26-usopen",
    sport: "PGA",
    name: "US Open 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-06-11T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "pga26-travelers",
    sport: "PGA",
    name: "Travelers Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-06-18T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "liv26-dc",
    sport: "LIV",
    name: "LIV Golf DC 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-06-19T17:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  {
    id: "liv26-lon",
    sport: "LIV",
    name: "LIV Golf London 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-06-26T11:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  // ── July ──────────────────────────────────────────────────────────────────
  {
    id: "pga26-scottish",
    sport: "PGA",
    name: "Genesis Scottish Open 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-07-09T09:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "pga26-open",
    sport: "PGA",
    name: "The Open Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-07-16T08:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "pga26-3m",
    sport: "PGA",
    name: "3M Open 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-07-23T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  // ── August ────────────────────────────────────────────────────────────────
  {
    id: "pga26-wyndham",
    sport: "PGA",
    name: "Wyndham Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-08-06T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "liv26-sing",
    sport: "LIV",
    name: "LIV Golf Singapore 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-08-07T04:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  // ── FedEx Cup Playoffs ─────────────────────────────────────────────────────
  {
    id: "pga26-fedex1",
    sport: "PGA",
    name: "FedEx St. Jude Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-08-13T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "pga26-bmw",
    sport: "PGA",
    name: "BMW Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-08-20T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  {
    id: "pga26-tourChamp",
    sport: "PGA",
    name: "Tour Championship 2026",
    season: "2025-2026",
    rounds: 4,
    r1Start: d("2026-08-27T12:00:00Z"),
    hoursPerRound: 24,
    pairs: PGA_PAIRS,
  },
  // ── Fall ──────────────────────────────────────────────────────────────────
  {
    id: "liv26-chi",
    sport: "LIV",
    name: "LIV Golf Chicago 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-09-18T17:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
  {
    id: "liv26-dal",
    sport: "LIV",
    name: "LIV Golf Dallas 2026",
    season: "2026",
    rounds: 3,
    r1Start: d("2026-10-02T17:00:00Z"),
    hoursPerRound: 24,
    pairs: LIV_PAIRS,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sync logic
// ─────────────────────────────────────────────────────────────────────────────

export interface GolfSyncResult {
  seeded: number;
  skipped: number;
  errors: string[];
}

/**
 * Upsert all rounds for a tournament.
 * Returns the number of matchup rows inserted/updated.
 */
async function seedTournament(t: GolfTournamentDef): Promise<number> {
  let count = 0;

  for (let roundIndex = 0; roundIndex < t.rounds; roundIndex++) {
    const roundNum = roundIndex + 1;
    const roundStart = new Date(t.r1Start.getTime() + roundIndex * t.hoursPerRound * 60 * 60 * 1000);

    // Determine status based on current time
    const now = new Date();
    let status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
    const roundEnd = new Date(roundStart.getTime() + t.hoursPerRound * 60 * 60 * 1000);
    if (now >= roundEnd) {
      status = "COMPLETED";
    } else if (now >= roundStart) {
      status = "IN_PROGRESS";
    } else {
      status = "SCHEDULED";
    }

    for (let pairIndex = 0; pairIndex < t.pairs.length; pairIndex++) {
      const [homeTeam, awayTeam] = t.pairs[pairIndex];
      const pairNum = String(pairIndex + 1).padStart(2, "0");
      const externalId = `${t.id}-r${roundNum}-${pairNum}`;

      await prisma.$executeRaw`
        INSERT INTO games (
          id, external_id, sport, league,
          home_team, away_team,
          scheduled_start, round, season, status,
          created_at, updated_at
        ) VALUES (
          ${randomUUID()},
          ${externalId},
          ${t.sport}::"Sport",
          ${t.name},
          ${homeTeam},
          ${awayTeam},
          ${roundStart},
          ${roundNum},
          ${t.season},
          ${status}::"GameStatus",
          NOW(), NOW()
        )
        ON CONFLICT (external_id) DO UPDATE SET
          status     = EXCLUDED.status,
          updated_at = NOW()
      `;
      count++;
    }
  }

  return count;
}

/**
 * Main sync function. Seeds any tournament whose R1 starts within the
 * next `daysAhead` days and hasn't been fully seeded yet.
 */
export async function syncGolfSchedule(
  daysAhead = 21
): Promise<GolfSyncResult> {
  const result: GolfSyncResult = { seeded: 0, skipped: 0, errors: [] };
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  for (const tournament of GOLF_SCHEDULE_2026) {
    // Only process tournaments whose R1 is within the lookahead window
    // (or already started / in progress)
    const lastRoundStart = new Date(
      tournament.r1Start.getTime() +
        (tournament.rounds - 1) * tournament.hoursPerRound * 60 * 60 * 1000
    );
    if (tournament.r1Start > horizon) continue; // too far in the future
    if (lastRoundStart < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      // Finished more than a week ago — skip
      result.skipped++;
      continue;
    }

    try {
      const count = await seedTournament(tournament);
      result.seeded += count;
    } catch (err) {
      result.errors.push(`${tournament.id}: ${String(err)}`);
    }
  }

  return result;
}
