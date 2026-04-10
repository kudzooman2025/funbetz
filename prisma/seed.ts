/**
 * Seed script for FIFA World Cup 2026 group stage games.
 *
 * Run with: npm run db:seed
 *
 * Games use external IDs prefixed with "wc2026-" so they don't conflict
 * with TheSportsDB IDs. Dates/times are approximate; update as official
 * kickoff times are announced.
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface GameSeed {
  externalId: string;
  sport: "WORLD_CUP";
  league: string;
  homeTeam: string;
  awayTeam: string;
  scheduledStart: Date;
  round: number;
  season: string;
}

// ── Helper ──────────────────────────────────────────────────────────────────
function utc(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00Z`);
}

// ── Group Stage – Round 1 (June 11–15) ─────────────────────────────────────
const round1: GameSeed[] = [
  // Group A
  { externalId: "wc2026-001", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Mexico", awayTeam: "Ecuador",       scheduledStart: utc("2026-06-11", "18:00"), round: 1, season: "2026" },
  { externalId: "wc2026-002", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "USA",    awayTeam: "Canada",         scheduledStart: utc("2026-06-11", "22:00"), round: 1, season: "2026" },
  // Group B
  { externalId: "wc2026-003", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Brazil", awayTeam: "Croatia",        scheduledStart: utc("2026-06-12", "15:00"), round: 1, season: "2026" },
  { externalId: "wc2026-004", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Serbia", awayTeam: "South Korea",    scheduledStart: utc("2026-06-12", "18:00"), round: 1, season: "2026" },
  // Group C
  { externalId: "wc2026-005", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Argentina", awayTeam: "Chile",       scheduledStart: utc("2026-06-12", "22:00"), round: 1, season: "2026" },
  { externalId: "wc2026-006", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Uruguay",   awayTeam: "Venezuela",   scheduledStart: utc("2026-06-13", "00:00"), round: 1, season: "2026" },
  // Group D
  { externalId: "wc2026-007", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "France",  awayTeam: "Belgium",       scheduledStart: utc("2026-06-13", "15:00"), round: 1, season: "2026" },
  { externalId: "wc2026-008", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Morocco", awayTeam: "Tunisia",       scheduledStart: utc("2026-06-13", "18:00"), round: 1, season: "2026" },
  // Group E
  { externalId: "wc2026-009", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Spain",      awayTeam: "Switzerland",  scheduledStart: utc("2026-06-13", "22:00"), round: 1, season: "2026" },
  { externalId: "wc2026-010", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Portugal",   awayTeam: "Czechia",       scheduledStart: utc("2026-06-14", "00:00"), round: 1, season: "2026" },
  // Group F
  { externalId: "wc2026-011", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Germany",    awayTeam: "Netherlands",   scheduledStart: utc("2026-06-14", "15:00"), round: 1, season: "2026" },
  { externalId: "wc2026-012", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Denmark",    awayTeam: "Austria",       scheduledStart: utc("2026-06-14", "18:00"), round: 1, season: "2026" },
  // Group G
  { externalId: "wc2026-013", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "England",    awayTeam: "Senegal",       scheduledStart: utc("2026-06-14", "22:00"), round: 1, season: "2026" },
  { externalId: "wc2026-014", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Iran",       awayTeam: "Algeria",       scheduledStart: utc("2026-06-15", "00:00"), round: 1, season: "2026" },
  // Group H
  { externalId: "wc2026-015", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Japan",      awayTeam: "Australia",     scheduledStart: utc("2026-06-15", "15:00"), round: 1, season: "2026" },
  { externalId: "wc2026-016", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Saudi Arabia", awayTeam: "Egypt",       scheduledStart: utc("2026-06-15", "18:00"), round: 1, season: "2026" },
];

// ── Group Stage – Round 2 (June 16–20) ─────────────────────────────────────
const round2: GameSeed[] = [
  { externalId: "wc2026-101", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "USA",       awayTeam: "Ecuador",     scheduledStart: utc("2026-06-16", "22:00"), round: 2, season: "2026" },
  { externalId: "wc2026-102", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Canada",    awayTeam: "Mexico",      scheduledStart: utc("2026-06-17", "00:00"), round: 2, season: "2026" },
  { externalId: "wc2026-103", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Brazil",    awayTeam: "South Korea", scheduledStart: utc("2026-06-17", "15:00"), round: 2, season: "2026" },
  { externalId: "wc2026-104", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Croatia",   awayTeam: "Serbia",      scheduledStart: utc("2026-06-17", "18:00"), round: 2, season: "2026" },
  { externalId: "wc2026-105", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Argentina", awayTeam: "Venezuela",   scheduledStart: utc("2026-06-17", "22:00"), round: 2, season: "2026" },
  { externalId: "wc2026-106", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Chile",     awayTeam: "Uruguay",     scheduledStart: utc("2026-06-18", "00:00"), round: 2, season: "2026" },
  { externalId: "wc2026-107", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "France",    awayTeam: "Tunisia",     scheduledStart: utc("2026-06-18", "15:00"), round: 2, season: "2026" },
  { externalId: "wc2026-108", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Belgium",   awayTeam: "Morocco",     scheduledStart: utc("2026-06-18", "18:00"), round: 2, season: "2026" },
  { externalId: "wc2026-109", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Spain",     awayTeam: "Czechia",     scheduledStart: utc("2026-06-18", "22:00"), round: 2, season: "2026" },
  { externalId: "wc2026-110", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Portugal",  awayTeam: "Switzerland", scheduledStart: utc("2026-06-19", "00:00"), round: 2, season: "2026" },
  { externalId: "wc2026-111", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Germany",   awayTeam: "Austria",     scheduledStart: utc("2026-06-19", "15:00"), round: 2, season: "2026" },
  { externalId: "wc2026-112", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Netherlands", awayTeam: "Denmark",   scheduledStart: utc("2026-06-19", "18:00"), round: 2, season: "2026" },
  { externalId: "wc2026-113", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "England",   awayTeam: "Algeria",     scheduledStart: utc("2026-06-19", "22:00"), round: 2, season: "2026" },
  { externalId: "wc2026-114", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Senegal",   awayTeam: "Iran",        scheduledStart: utc("2026-06-20", "00:00"), round: 2, season: "2026" },
  { externalId: "wc2026-115", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Japan",     awayTeam: "Egypt",       scheduledStart: utc("2026-06-20", "15:00"), round: 2, season: "2026" },
  { externalId: "wc2026-116", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Australia", awayTeam: "Saudi Arabia", scheduledStart: utc("2026-06-20", "18:00"), round: 2, season: "2026" },
];

// ── Group Stage – Round 3 (June 21–26, simultaneous group deciders) ─────────
const round3: GameSeed[] = [
  { externalId: "wc2026-201", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "USA",         awayTeam: "Mexico",      scheduledStart: utc("2026-06-22", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-202", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Ecuador",     awayTeam: "Canada",      scheduledStart: utc("2026-06-22", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-203", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Brazil",      awayTeam: "Serbia",      scheduledStart: utc("2026-06-23", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-204", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "South Korea", awayTeam: "Croatia",     scheduledStart: utc("2026-06-23", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-205", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Argentina",   awayTeam: "Uruguay",     scheduledStart: utc("2026-06-24", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-206", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Venezuela",   awayTeam: "Chile",       scheduledStart: utc("2026-06-24", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-207", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "France",      awayTeam: "Morocco",     scheduledStart: utc("2026-06-25", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-208", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Tunisia",     awayTeam: "Belgium",     scheduledStart: utc("2026-06-25", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-209", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Spain",       awayTeam: "Portugal",    scheduledStart: utc("2026-06-26", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-210", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Switzerland", awayTeam: "Czechia",     scheduledStart: utc("2026-06-26", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-211", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Germany",     awayTeam: "Denmark",     scheduledStart: utc("2026-06-27", "22:00"), round: 3, season: "2026" },
  { externalId: "wc2026-212", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "Austria",     awayTeam: "Netherlands", scheduledStart: utc("2026-06-27", "22:00"), round: 3, season: "2026" },
];

// ── Round of 32 (June 29 – July 4) ─────────────────────────────────────────
const roundOf32: GameSeed[] = [
  { externalId: "wc2026-301", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1A", awayTeam: "2B", scheduledStart: utc("2026-06-29", "18:00"), round: 4, season: "2026" },
  { externalId: "wc2026-302", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1B", awayTeam: "2A", scheduledStart: utc("2026-06-29", "22:00"), round: 4, season: "2026" },
  { externalId: "wc2026-303", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1C", awayTeam: "2D", scheduledStart: utc("2026-06-30", "18:00"), round: 4, season: "2026" },
  { externalId: "wc2026-304", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1D", awayTeam: "2C", scheduledStart: utc("2026-06-30", "22:00"), round: 4, season: "2026" },
  { externalId: "wc2026-305", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1E", awayTeam: "2F", scheduledStart: utc("2026-07-01", "18:00"), round: 4, season: "2026" },
  { externalId: "wc2026-306", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1F", awayTeam: "2E", scheduledStart: utc("2026-07-01", "22:00"), round: 4, season: "2026" },
  { externalId: "wc2026-307", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1G", awayTeam: "2H", scheduledStart: utc("2026-07-02", "18:00"), round: 4, season: "2026" },
  { externalId: "wc2026-308", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "1H", awayTeam: "2G", scheduledStart: utc("2026-07-02", "22:00"), round: 4, season: "2026" },
];

// ── Round of 16 (July 6–9) ─────────────────────────────────────────────────
const roundOf16: GameSeed[] = [
  { externalId: "wc2026-401", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W301", awayTeam: "W302", scheduledStart: utc("2026-07-06", "18:00"), round: 5, season: "2026" },
  { externalId: "wc2026-402", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W303", awayTeam: "W304", scheduledStart: utc("2026-07-06", "22:00"), round: 5, season: "2026" },
  { externalId: "wc2026-403", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W305", awayTeam: "W306", scheduledStart: utc("2026-07-07", "18:00"), round: 5, season: "2026" },
  { externalId: "wc2026-404", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W307", awayTeam: "W308", scheduledStart: utc("2026-07-07", "22:00"), round: 5, season: "2026" },
  { externalId: "wc2026-405", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W309", awayTeam: "W310", scheduledStart: utc("2026-07-08", "18:00"), round: 5, season: "2026" },
  { externalId: "wc2026-406", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W311", awayTeam: "W312", scheduledStart: utc("2026-07-08", "22:00"), round: 5, season: "2026" },
  { externalId: "wc2026-407", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W313", awayTeam: "W314", scheduledStart: utc("2026-07-09", "18:00"), round: 5, season: "2026" },
  { externalId: "wc2026-408", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W315", awayTeam: "W316", scheduledStart: utc("2026-07-09", "22:00"), round: 5, season: "2026" },
];

// ── Quarterfinals (July 11–12) ─────────────────────────────────────────────
const quarterfinals: GameSeed[] = [
  { externalId: "wc2026-501", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W401", awayTeam: "W402", scheduledStart: utc("2026-07-11", "18:00"), round: 6, season: "2026" },
  { externalId: "wc2026-502", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W403", awayTeam: "W404", scheduledStart: utc("2026-07-11", "22:00"), round: 6, season: "2026" },
  { externalId: "wc2026-503", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W405", awayTeam: "W406", scheduledStart: utc("2026-07-12", "18:00"), round: 6, season: "2026" },
  { externalId: "wc2026-504", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W407", awayTeam: "W408", scheduledStart: utc("2026-07-12", "22:00"), round: 6, season: "2026" },
];

// ── Semifinals (July 14–15) ────────────────────────────────────────────────
const semifinals: GameSeed[] = [
  { externalId: "wc2026-601", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W501", awayTeam: "W502", scheduledStart: utc("2026-07-14", "22:00"), round: 7, season: "2026" },
  { externalId: "wc2026-602", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W503", awayTeam: "W504", scheduledStart: utc("2026-07-15", "22:00"), round: 7, season: "2026" },
];

// ── Third-place playoff + Final ────────────────────────────────────────────
const finalMatches: GameSeed[] = [
  { externalId: "wc2026-701", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "L601", awayTeam: "L602", scheduledStart: utc("2026-07-18", "15:00"), round: 7, season: "2026" },
  { externalId: "wc2026-702", sport: "WORLD_CUP", league: "FIFA World Cup 2026", homeTeam: "W601", awayTeam: "W602", scheduledStart: utc("2026-07-19", "19:00"), round: 7, season: "2026" },
];

const allGames: GameSeed[] = [
  ...round1,
  ...round2,
  ...round3,
  ...roundOf32,
  ...roundOf16,
  ...quarterfinals,
  ...semifinals,
  ...finalMatches,
];

async function main() {
  console.log(`Seeding ${allGames.length} FIFA World Cup 2026 games...`);

  const client = await pool.connect();
  let created = 0;
  let skipped = 0;

  try {
    for (const game of allGames) {
      // Check if game already exists
      const existing = await client.query(
        'SELECT id FROM games WHERE external_id = $1',
        [game.externalId]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO games
          (id, external_id, sport, league, home_team, away_team, scheduled_start, round, season, status, created_at, updated_at)
         VALUES
          (gen_random_uuid()::text, $1, $2::"Sport", $3, $4, $5, $6, $7, $8, 'SCHEDULED'::"GameStatus", now(), now())`,
        [
          game.externalId,
          game.sport,
          game.league,
          game.homeTeam,
          game.awayTeam,
          game.scheduledStart,
          game.round,
          game.season,
        ]
      );
      created++;
    }

    console.log(`Done! Created: ${created}, Already existed: ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
