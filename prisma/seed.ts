/**
 * Seed script for FIFA World Cup 2026 – all 104 official matches.
 *
 * Sources: ESPN official fixture list, Sky Sports day-by-day schedule.
 * All times stored as UTC. EDT = UTC-4 (US summer).
 *
 * Run with: npm run db:seed
 *
 * This script DELETES any existing wc26-* and wc2026-* games before inserting,
 * so it is safe to re-run.
 */

import "dotenv/config";
import { Pool } from "pg";
import { randomUUID } from "crypto";

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

function utc(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00Z`);
}

const LEAGUE = "FIFA World Cup 2026";
const SEASON = "2026";
const SPORT = "WORLD_CUP" as const;

// ── Matchday 1 (each team's first group game) ───────────────────────────────
// Groups A-H play June 11-15; Groups I-L play June 16-17
const matchday1: GameSeed[] = [
  // Group A
  { externalId: "wc26-gs-001", sport: SPORT, league: LEAGUE, homeTeam: "Mexico",        awayTeam: "South Africa",       scheduledStart: utc("2026-06-11", "19:00"), round: 1, season: SEASON },
  { externalId: "wc26-gs-002", sport: SPORT, league: LEAGUE, homeTeam: "South Korea",   awayTeam: "Czechia",            scheduledStart: utc("2026-06-12", "02:00"), round: 1, season: SEASON },
  // Group B
  { externalId: "wc26-gs-003", sport: SPORT, league: LEAGUE, homeTeam: "Canada",        awayTeam: "Bosnia & Herzegovina", scheduledStart: utc("2026-06-12", "19:00"), round: 1, season: SEASON },
  // Group D
  { externalId: "wc26-gs-004", sport: SPORT, league: LEAGUE, homeTeam: "USA",           awayTeam: "Paraguay",           scheduledStart: utc("2026-06-13", "01:00"), round: 1, season: SEASON },
  // Group B
  { externalId: "wc26-gs-005", sport: SPORT, league: LEAGUE, homeTeam: "Qatar",         awayTeam: "Switzerland",        scheduledStart: utc("2026-06-13", "19:00"), round: 1, season: SEASON },
  // Group C
  { externalId: "wc26-gs-006", sport: SPORT, league: LEAGUE, homeTeam: "Brazil",        awayTeam: "Morocco",            scheduledStart: utc("2026-06-13", "22:00"), round: 1, season: SEASON },
  { externalId: "wc26-gs-007", sport: SPORT, league: LEAGUE, homeTeam: "Haiti",         awayTeam: "Scotland",           scheduledStart: utc("2026-06-14", "01:00"), round: 1, season: SEASON },
  // Group D
  { externalId: "wc26-gs-008", sport: SPORT, league: LEAGUE, homeTeam: "Australia",     awayTeam: "Turkey",             scheduledStart: utc("2026-06-14", "04:00"), round: 1, season: SEASON },
  // Group E
  { externalId: "wc26-gs-009", sport: SPORT, league: LEAGUE, homeTeam: "Germany",       awayTeam: "Curaçao",            scheduledStart: utc("2026-06-14", "17:00"), round: 1, season: SEASON },
  // Group F
  { externalId: "wc26-gs-010", sport: SPORT, league: LEAGUE, homeTeam: "Netherlands",   awayTeam: "Japan",              scheduledStart: utc("2026-06-14", "20:00"), round: 1, season: SEASON },
  // Group E
  { externalId: "wc26-gs-011", sport: SPORT, league: LEAGUE, homeTeam: "Ivory Coast",   awayTeam: "Ecuador",            scheduledStart: utc("2026-06-14", "23:00"), round: 1, season: SEASON },
  // Group F
  { externalId: "wc26-gs-012", sport: SPORT, league: LEAGUE, homeTeam: "Sweden",        awayTeam: "Tunisia",            scheduledStart: utc("2026-06-15", "02:00"), round: 1, season: SEASON },
  // Group H
  { externalId: "wc26-gs-013", sport: SPORT, league: LEAGUE, homeTeam: "Spain",         awayTeam: "Cabo Verde",         scheduledStart: utc("2026-06-15", "17:00"), round: 1, season: SEASON },
  // Group G
  { externalId: "wc26-gs-014", sport: SPORT, league: LEAGUE, homeTeam: "Belgium",       awayTeam: "Egypt",              scheduledStart: utc("2026-06-15", "22:00"), round: 1, season: SEASON },
  // Group H
  { externalId: "wc26-gs-015", sport: SPORT, league: LEAGUE, homeTeam: "Saudi Arabia",  awayTeam: "Uruguay",            scheduledStart: utc("2026-06-15", "22:00"), round: 1, season: SEASON },
  // Group G
  { externalId: "wc26-gs-016", sport: SPORT, league: LEAGUE, homeTeam: "Iran",          awayTeam: "New Zealand",        scheduledStart: utc("2026-06-16", "04:00"), round: 1, season: SEASON },
  // Group I
  { externalId: "wc26-gs-017", sport: SPORT, league: LEAGUE, homeTeam: "France",        awayTeam: "Senegal",            scheduledStart: utc("2026-06-16", "19:00"), round: 1, season: SEASON },
  { externalId: "wc26-gs-018", sport: SPORT, league: LEAGUE, homeTeam: "Iraq",          awayTeam: "Norway",             scheduledStart: utc("2026-06-16", "22:00"), round: 1, season: SEASON },
  // Group J
  { externalId: "wc26-gs-019", sport: SPORT, league: LEAGUE, homeTeam: "Argentina",     awayTeam: "Algeria",            scheduledStart: utc("2026-06-17", "01:00"), round: 1, season: SEASON },
  { externalId: "wc26-gs-020", sport: SPORT, league: LEAGUE, homeTeam: "Austria",       awayTeam: "Jordan",             scheduledStart: utc("2026-06-17", "04:00"), round: 1, season: SEASON },
  // Group K
  { externalId: "wc26-gs-021", sport: SPORT, league: LEAGUE, homeTeam: "Portugal",      awayTeam: "Congo DR",           scheduledStart: utc("2026-06-17", "17:00"), round: 1, season: SEASON },
  // Group L
  { externalId: "wc26-gs-022", sport: SPORT, league: LEAGUE, homeTeam: "England",       awayTeam: "Croatia",            scheduledStart: utc("2026-06-17", "20:00"), round: 1, season: SEASON },
  { externalId: "wc26-gs-023", sport: SPORT, league: LEAGUE, homeTeam: "Ghana",         awayTeam: "Panama",             scheduledStart: utc("2026-06-17", "23:00"), round: 1, season: SEASON },
  // Group K
  { externalId: "wc26-gs-024", sport: SPORT, league: LEAGUE, homeTeam: "Uzbekistan",    awayTeam: "Colombia",           scheduledStart: utc("2026-06-18", "02:00"), round: 1, season: SEASON },
];

// ── Matchday 2 (each team's second group game) ──────────────────────────────
const matchday2: GameSeed[] = [
  // Group A
  { externalId: "wc26-gs-025", sport: SPORT, league: LEAGUE, homeTeam: "Czechia",             awayTeam: "South Africa",       scheduledStart: utc("2026-06-18", "16:00"), round: 2, season: SEASON },
  // Group B
  { externalId: "wc26-gs-026", sport: SPORT, league: LEAGUE, homeTeam: "Switzerland",         awayTeam: "Bosnia & Herzegovina", scheduledStart: utc("2026-06-18", "19:00"), round: 2, season: SEASON },
  { externalId: "wc26-gs-027", sport: SPORT, league: LEAGUE, homeTeam: "Canada",              awayTeam: "Qatar",              scheduledStart: utc("2026-06-18", "22:00"), round: 2, season: SEASON },
  // Group A
  { externalId: "wc26-gs-028", sport: SPORT, league: LEAGUE, homeTeam: "Mexico",              awayTeam: "South Korea",        scheduledStart: utc("2026-06-19", "03:00"), round: 2, season: SEASON },
  // Group D
  { externalId: "wc26-gs-029", sport: SPORT, league: LEAGUE, homeTeam: "USA",                 awayTeam: "Australia",          scheduledStart: utc("2026-06-19", "19:00"), round: 2, season: SEASON },
  // Group C
  { externalId: "wc26-gs-030", sport: SPORT, league: LEAGUE, homeTeam: "Scotland",            awayTeam: "Morocco",            scheduledStart: utc("2026-06-19", "22:00"), round: 2, season: SEASON },
  { externalId: "wc26-gs-031", sport: SPORT, league: LEAGUE, homeTeam: "Brazil",              awayTeam: "Haiti",              scheduledStart: utc("2026-06-20", "01:00"), round: 2, season: SEASON },
  // Group D
  { externalId: "wc26-gs-032", sport: SPORT, league: LEAGUE, homeTeam: "Turkey",              awayTeam: "Paraguay",           scheduledStart: utc("2026-06-20", "04:00"), round: 2, season: SEASON },
  // Group F
  { externalId: "wc26-gs-033", sport: SPORT, league: LEAGUE, homeTeam: "Netherlands",         awayTeam: "Sweden",             scheduledStart: utc("2026-06-20", "17:00"), round: 2, season: SEASON },
  // Group E
  { externalId: "wc26-gs-034", sport: SPORT, league: LEAGUE, homeTeam: "Germany",             awayTeam: "Ivory Coast",        scheduledStart: utc("2026-06-20", "20:00"), round: 2, season: SEASON },
  { externalId: "wc26-gs-035", sport: SPORT, league: LEAGUE, homeTeam: "Ecuador",             awayTeam: "Curaçao",            scheduledStart: utc("2026-06-21", "00:00"), round: 2, season: SEASON },
  // Group F
  { externalId: "wc26-gs-036", sport: SPORT, league: LEAGUE, homeTeam: "Tunisia",             awayTeam: "Japan",              scheduledStart: utc("2026-06-21", "04:00"), round: 2, season: SEASON },
  // Group H
  { externalId: "wc26-gs-037", sport: SPORT, league: LEAGUE, homeTeam: "Spain",               awayTeam: "Saudi Arabia",       scheduledStart: utc("2026-06-21", "16:00"), round: 2, season: SEASON },
  // Group G
  { externalId: "wc26-gs-038", sport: SPORT, league: LEAGUE, homeTeam: "Belgium",             awayTeam: "Iran",               scheduledStart: utc("2026-06-21", "19:00"), round: 2, season: SEASON },
  // Group H
  { externalId: "wc26-gs-039", sport: SPORT, league: LEAGUE, homeTeam: "Uruguay",             awayTeam: "Cabo Verde",         scheduledStart: utc("2026-06-21", "22:00"), round: 2, season: SEASON },
  // Group G
  { externalId: "wc26-gs-040", sport: SPORT, league: LEAGUE, homeTeam: "New Zealand",         awayTeam: "Egypt",              scheduledStart: utc("2026-06-22", "01:00"), round: 2, season: SEASON },
  // Group J
  { externalId: "wc26-gs-041", sport: SPORT, league: LEAGUE, homeTeam: "Argentina",           awayTeam: "Austria",            scheduledStart: utc("2026-06-22", "17:00"), round: 2, season: SEASON },
  // Group I
  { externalId: "wc26-gs-042", sport: SPORT, league: LEAGUE, homeTeam: "France",              awayTeam: "Iraq",               scheduledStart: utc("2026-06-22", "21:00"), round: 2, season: SEASON },
  { externalId: "wc26-gs-043", sport: SPORT, league: LEAGUE, homeTeam: "Norway",              awayTeam: "Senegal",            scheduledStart: utc("2026-06-23", "00:00"), round: 2, season: SEASON },
  // Group J
  { externalId: "wc26-gs-044", sport: SPORT, league: LEAGUE, homeTeam: "Jordan",              awayTeam: "Algeria",            scheduledStart: utc("2026-06-23", "03:00"), round: 2, season: SEASON },
  // Group K
  { externalId: "wc26-gs-045", sport: SPORT, league: LEAGUE, homeTeam: "Portugal",            awayTeam: "Uzbekistan",         scheduledStart: utc("2026-06-23", "17:00"), round: 2, season: SEASON },
  // Group L
  { externalId: "wc26-gs-046", sport: SPORT, league: LEAGUE, homeTeam: "England",             awayTeam: "Ghana",              scheduledStart: utc("2026-06-23", "20:00"), round: 2, season: SEASON },
  { externalId: "wc26-gs-047", sport: SPORT, league: LEAGUE, homeTeam: "Panama",              awayTeam: "Croatia",            scheduledStart: utc("2026-06-23", "23:00"), round: 2, season: SEASON },
  // Group K
  { externalId: "wc26-gs-048", sport: SPORT, league: LEAGUE, homeTeam: "Colombia",            awayTeam: "Congo DR",           scheduledStart: utc("2026-06-24", "02:00"), round: 2, season: SEASON },
];

// ── Matchday 3 (final group games – simultaneous within each group) ──────────
const matchday3: GameSeed[] = [
  // Group B (simultaneous 3pm ET / 19:00 UTC)
  { externalId: "wc26-gs-049", sport: SPORT, league: LEAGUE, homeTeam: "Switzerland",         awayTeam: "Canada",             scheduledStart: utc("2026-06-24", "19:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-050", sport: SPORT, league: LEAGUE, homeTeam: "Bosnia & Herzegovina", awayTeam: "Qatar",             scheduledStart: utc("2026-06-24", "19:00"), round: 3, season: SEASON },
  // Group C (simultaneous 6pm ET / 22:00 UTC)
  { externalId: "wc26-gs-051", sport: SPORT, league: LEAGUE, homeTeam: "Scotland",            awayTeam: "Brazil",             scheduledStart: utc("2026-06-24", "22:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-052", sport: SPORT, league: LEAGUE, homeTeam: "Morocco",             awayTeam: "Haiti",              scheduledStart: utc("2026-06-24", "22:00"), round: 3, season: SEASON },
  // Group A (simultaneous 9pm ET / 01:00 UTC June 25)
  { externalId: "wc26-gs-053", sport: SPORT, league: LEAGUE, homeTeam: "Czechia",             awayTeam: "Mexico",             scheduledStart: utc("2026-06-25", "01:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-054", sport: SPORT, league: LEAGUE, homeTeam: "South Africa",        awayTeam: "South Korea",        scheduledStart: utc("2026-06-25", "01:00"), round: 3, season: SEASON },
  // Group E (simultaneous 4pm ET / 20:00 UTC)
  { externalId: "wc26-gs-055", sport: SPORT, league: LEAGUE, homeTeam: "Ecuador",             awayTeam: "Germany",            scheduledStart: utc("2026-06-25", "20:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-056", sport: SPORT, league: LEAGUE, homeTeam: "Curaçao",             awayTeam: "Ivory Coast",        scheduledStart: utc("2026-06-25", "20:00"), round: 3, season: SEASON },
  // Group F (simultaneous 7pm ET / 23:00 UTC)
  { externalId: "wc26-gs-057", sport: SPORT, league: LEAGUE, homeTeam: "Japan",               awayTeam: "Sweden",             scheduledStart: utc("2026-06-25", "23:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-058", sport: SPORT, league: LEAGUE, homeTeam: "Tunisia",             awayTeam: "Netherlands",        scheduledStart: utc("2026-06-25", "23:00"), round: 3, season: SEASON },
  // Group D (simultaneous 10pm ET / 02:00 UTC June 26)
  { externalId: "wc26-gs-059", sport: SPORT, league: LEAGUE, homeTeam: "Turkey",              awayTeam: "USA",                scheduledStart: utc("2026-06-26", "02:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-060", sport: SPORT, league: LEAGUE, homeTeam: "Paraguay",            awayTeam: "Australia",          scheduledStart: utc("2026-06-26", "02:00"), round: 3, season: SEASON },
  // Group I (simultaneous 3pm ET / 19:00 UTC)
  { externalId: "wc26-gs-061", sport: SPORT, league: LEAGUE, homeTeam: "Norway",              awayTeam: "France",             scheduledStart: utc("2026-06-26", "19:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-062", sport: SPORT, league: LEAGUE, homeTeam: "Senegal",             awayTeam: "Iraq",               scheduledStart: utc("2026-06-26", "19:00"), round: 3, season: SEASON },
  // Group H (simultaneous 8pm ET / 00:00 UTC June 27)
  { externalId: "wc26-gs-063", sport: SPORT, league: LEAGUE, homeTeam: "Cabo Verde",          awayTeam: "Saudi Arabia",       scheduledStart: utc("2026-06-27", "00:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-064", sport: SPORT, league: LEAGUE, homeTeam: "Uruguay",             awayTeam: "Spain",              scheduledStart: utc("2026-06-27", "00:00"), round: 3, season: SEASON },
  // Group G (simultaneous 11pm ET / 03:00 UTC June 27)
  { externalId: "wc26-gs-065", sport: SPORT, league: LEAGUE, homeTeam: "Egypt",               awayTeam: "Iran",               scheduledStart: utc("2026-06-27", "03:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-066", sport: SPORT, league: LEAGUE, homeTeam: "New Zealand",         awayTeam: "Belgium",            scheduledStart: utc("2026-06-27", "03:00"), round: 3, season: SEASON },
  // Group L (simultaneous 5pm ET / 21:00 UTC)
  { externalId: "wc26-gs-067", sport: SPORT, league: LEAGUE, homeTeam: "Panama",              awayTeam: "England",            scheduledStart: utc("2026-06-27", "21:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-068", sport: SPORT, league: LEAGUE, homeTeam: "Croatia",             awayTeam: "Ghana",              scheduledStart: utc("2026-06-27", "21:00"), round: 3, season: SEASON },
  // Group K (simultaneous 7:30pm ET / 23:30 UTC)
  { externalId: "wc26-gs-069", sport: SPORT, league: LEAGUE, homeTeam: "Colombia",            awayTeam: "Portugal",           scheduledStart: utc("2026-06-27", "23:30"), round: 3, season: SEASON },
  { externalId: "wc26-gs-070", sport: SPORT, league: LEAGUE, homeTeam: "Congo DR",            awayTeam: "Uzbekistan",         scheduledStart: utc("2026-06-27", "23:30"), round: 3, season: SEASON },
  // Group J (simultaneous 10pm ET / 02:00 UTC June 28)
  { externalId: "wc26-gs-071", sport: SPORT, league: LEAGUE, homeTeam: "Algeria",             awayTeam: "Austria",            scheduledStart: utc("2026-06-28", "02:00"), round: 3, season: SEASON },
  { externalId: "wc26-gs-072", sport: SPORT, league: LEAGUE, homeTeam: "Jordan",              awayTeam: "Argentina",          scheduledStart: utc("2026-06-28", "02:00"), round: 3, season: SEASON },
];

// ── Round of 32 (June 28 – July 4) ─────────────────────────────────────────
// Team names are placeholders — updated by sync cron once group stage completes
const roundOf32: GameSeed[] = [
  { externalId: "wc26-r32-01", sport: SPORT, league: LEAGUE, homeTeam: "R/U Group A", awayTeam: "R/U Group B", scheduledStart: utc("2026-06-28", "19:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-02", sport: SPORT, league: LEAGUE, homeTeam: "W Group C",   awayTeam: "R/U Group F", scheduledStart: utc("2026-06-29", "17:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-03", sport: SPORT, league: LEAGUE, homeTeam: "W Group E",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-06-29", "20:30"), round: 4, season: SEASON },
  { externalId: "wc26-r32-04", sport: SPORT, league: LEAGUE, homeTeam: "W Group F",   awayTeam: "R/U Group C", scheduledStart: utc("2026-06-30", "01:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-05", sport: SPORT, league: LEAGUE, homeTeam: "R/U Group E", awayTeam: "R/U Group I", scheduledStart: utc("2026-06-30", "17:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-06", sport: SPORT, league: LEAGUE, homeTeam: "W Group I",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-06-30", "21:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-07", sport: SPORT, league: LEAGUE, homeTeam: "W Group A",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-07-01", "01:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-08", sport: SPORT, league: LEAGUE, homeTeam: "W Group L",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-07-01", "16:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-09", sport: SPORT, league: LEAGUE, homeTeam: "W Group G",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-07-01", "20:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-10", sport: SPORT, league: LEAGUE, homeTeam: "W Group D",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-07-02", "00:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-11", sport: SPORT, league: LEAGUE, homeTeam: "W Group H",   awayTeam: "R/U Group J", scheduledStart: utc("2026-07-02", "19:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-12", sport: SPORT, league: LEAGUE, homeTeam: "R/U Group K", awayTeam: "R/U Group L", scheduledStart: utc("2026-07-02", "23:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-13", sport: SPORT, league: LEAGUE, homeTeam: "W Group B",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-07-03", "03:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-14", sport: SPORT, league: LEAGUE, homeTeam: "R/U Group D", awayTeam: "R/U Group G", scheduledStart: utc("2026-07-03", "18:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-15", sport: SPORT, league: LEAGUE, homeTeam: "W Group J",   awayTeam: "R/U Group H", scheduledStart: utc("2026-07-03", "22:00"), round: 4, season: SEASON },
  { externalId: "wc26-r32-16", sport: SPORT, league: LEAGUE, homeTeam: "W Group K",   awayTeam: "Best 3rd",    scheduledStart: utc("2026-07-04", "01:30"), round: 4, season: SEASON },
];

// ── Round of 16 (July 4-7) ──────────────────────────────────────────────────
const roundOf16: GameSeed[] = [
  { externalId: "wc26-r16-01", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M1",  awayTeam: "W R32-M2",  scheduledStart: utc("2026-07-04", "17:00"), round: 5, season: SEASON },
  { externalId: "wc26-r16-02", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M3",  awayTeam: "W R32-M4",  scheduledStart: utc("2026-07-04", "21:00"), round: 5, season: SEASON },
  { externalId: "wc26-r16-03", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M5",  awayTeam: "W R32-M6",  scheduledStart: utc("2026-07-05", "21:00"), round: 5, season: SEASON },
  { externalId: "wc26-r16-04", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M7",  awayTeam: "W R32-M8",  scheduledStart: utc("2026-07-06", "01:00"), round: 5, season: SEASON },
  { externalId: "wc26-r16-05", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M9",  awayTeam: "W R32-M10", scheduledStart: utc("2026-07-06", "19:00"), round: 5, season: SEASON },
  { externalId: "wc26-r16-06", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M11", awayTeam: "W R32-M12", scheduledStart: utc("2026-07-07", "01:00"), round: 5, season: SEASON },
  { externalId: "wc26-r16-07", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M13", awayTeam: "W R32-M14", scheduledStart: utc("2026-07-07", "17:00"), round: 5, season: SEASON },
  { externalId: "wc26-r16-08", sport: SPORT, league: LEAGUE, homeTeam: "W R32-M15", awayTeam: "W R32-M16", scheduledStart: utc("2026-07-07", "21:00"), round: 5, season: SEASON },
];

// ── Quarterfinals (July 9-12) ───────────────────────────────────────────────
const quarterfinals: GameSeed[] = [
  { externalId: "wc26-qf-01", sport: SPORT, league: LEAGUE, homeTeam: "W R16-M1", awayTeam: "W R16-M2", scheduledStart: utc("2026-07-09", "21:00"), round: 6, season: SEASON },
  { externalId: "wc26-qf-02", sport: SPORT, league: LEAGUE, homeTeam: "W R16-M3", awayTeam: "W R16-M4", scheduledStart: utc("2026-07-10", "20:00"), round: 6, season: SEASON },
  { externalId: "wc26-qf-03", sport: SPORT, league: LEAGUE, homeTeam: "W R16-M5", awayTeam: "W R16-M6", scheduledStart: utc("2026-07-11", "22:00"), round: 6, season: SEASON },
  { externalId: "wc26-qf-04", sport: SPORT, league: LEAGUE, homeTeam: "W R16-M7", awayTeam: "W R16-M8", scheduledStart: utc("2026-07-12", "02:00"), round: 6, season: SEASON },
];

// ── Semifinals (July 14-15) ─────────────────────────────────────────────────
const semifinals: GameSeed[] = [
  { externalId: "wc26-sf-01", sport: SPORT, league: LEAGUE, homeTeam: "W QF-M1", awayTeam: "W QF-M2", scheduledStart: utc("2026-07-14", "20:00"), round: 7, season: SEASON },
  { externalId: "wc26-sf-02", sport: SPORT, league: LEAGUE, homeTeam: "W QF-M3", awayTeam: "W QF-M4", scheduledStart: utc("2026-07-15", "20:00"), round: 7, season: SEASON },
];

// ── Third-place playoff + Final ─────────────────────────────────────────────
const finalMatches: GameSeed[] = [
  { externalId: "wc26-3rd",   sport: SPORT, league: LEAGUE, homeTeam: "L SF-M1", awayTeam: "L SF-M2", scheduledStart: utc("2026-07-18", "22:00"), round: 7, season: SEASON },
  { externalId: "wc26-final", sport: SPORT, league: LEAGUE, homeTeam: "W SF-M1", awayTeam: "W SF-M2", scheduledStart: utc("2026-07-19", "20:00"), round: 7, season: SEASON },
];

const allGames: GameSeed[] = [
  ...matchday1,
  ...matchday2,
  ...matchday3,
  ...roundOf32,
  ...roundOf16,
  ...quarterfinals,
  ...semifinals,
  ...finalMatches,
];

async function main() {
  console.log("Connecting to database...");
  const client = await pool.connect();

  try {
    // Delete old incorrect seed data (both old prefix and new prefix)
    console.log("Removing old World Cup seed data...");
    const del = await client.query(
      `DELETE FROM games WHERE external_id LIKE 'wc2026-%' OR external_id LIKE 'wc26-%'`
    );
    console.log(`  Deleted ${del.rowCount} existing World Cup games.`);

    // Insert correct games
    console.log(`Seeding ${allGames.length} FIFA World Cup 2026 games...`);
    let created = 0;

    for (const game of allGames) {
      await client.query(
        `INSERT INTO games
          (id, external_id, sport, league, home_team, away_team, scheduled_start, round, season, status, created_at, updated_at)
         VALUES
          ($1, $2, $3::"Sport", $4, $5, $6, $7, $8, $9, 'SCHEDULED'::"GameStatus", NOW(), NOW())
         ON CONFLICT (external_id) DO NOTHING`,
        [
          randomUUID(),
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

    console.log(`\n✓ Seeded ${created} games successfully.`);
    console.log(`  Group Stage MD1 : ${matchday1.length} games`);
    console.log(`  Group Stage MD2 : ${matchday2.length} games`);
    console.log(`  Group Stage MD3 : ${matchday3.length} games`);
    console.log(`  Round of 32     : ${roundOf32.length} games`);
    console.log(`  Round of 16     : ${roundOf16.length} games`);
    console.log(`  Quarterfinals   : ${quarterfinals.length} games`);
    console.log(`  Semifinals      : ${semifinals.length} games`);
    console.log(`  Final matches   : ${finalMatches.length} games`);
    console.log(`  TOTAL           : ${allGames.length} games`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
