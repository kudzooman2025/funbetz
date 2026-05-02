/**
 * Seed: MLS NEXT Cup Qualifier – Virginia Regional
 * U13 Academy Division – Group Play
 * May 1–2, 2026 | Publix Virginia Youth Training Center
 *
 * Run: npx tsx prisma/seed-mlsnext.ts
 * Requires: npx prisma db push --config prisma/prisma.config.ts (to add MLSNEXT enum first)
 */

import path from "node:path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// All times are US Eastern (EDT = UTC-4) — converted to UTC ISO strings
// Format: YYYY-MM-DDTHH:MM:00.000Z
function edt(date: string, time: string): Date {
  // date: "YYYY-MM-DD", time: "HH:MM" (24h)
  // EDT is UTC-4, so add 4 hours
  const [h, m] = time.split(":").map(Number);
  const utcHour = h + 4;
  const d = new Date(`${date}T${String(utcHour).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`);
  return d;
}

const LEAGUE = "MLS NEXT Cup Qualifier – Virginia Regional";
const SEASON = "2026";

const GAMES: {
  externalId: string;
  home: string;
  away: string;
  start: Date;
  round: number;
  group: string;
}[] = [
  // ─── Friday May 1 — Round 1 ───────────────────────────────────────────────
  // 7:45am EDT
  { externalId: "mlsnext-va26-19747", home: "Carolina Velocity FC",           away: "Shore FC", start: edt("2026-05-01","07:45"), round: 1, group: "A" },
  { externalId: "mlsnext-va26-19748", home: "Bethesda SC",                    away: "Springfield SYC",               start: edt("2026-05-01","07:45"), round: 1, group: "A" },
  { externalId: "mlsnext-va26-19749", home: "Players Development Academy",    away: "Sporting Athletic Club",        start: edt("2026-05-01","07:45"), round: 1, group: "H" },
  { externalId: "mlsnext-va26-19750", home: "Charlotte Independence SC",      away: "Virginia Revolution SC",        start: edt("2026-05-01","07:45"), round: 1, group: "H" },
  // 9:15am EDT
  { externalId: "mlsnext-va26-19755", home: "Alexandria SA",                  away: "TBD",                           start: edt("2026-05-01","09:15"), round: 1, group: "B" },
  { externalId: "mlsnext-va26-19756", home: "Carolina Core FC",               away: "West Virginia Soccer",          start: edt("2026-05-01","09:15"), round: 1, group: "B" },
  { externalId: "mlsnext-va26-19757", home: "Real Futbol Academy",            away: "Wake FC",                       start: edt("2026-05-01","09:15"), round: 1, group: "G" },
  { externalId: "mlsnext-va26-19758", home: "Loudoun Soccer Club",            away: "Keystone FC",                   start: edt("2026-05-01","09:15"), round: 1, group: "G" },
  // 10:45am EDT
  { externalId: "mlsnext-va26-19707", home: "Baltimore Armour",               away: "PA Classics Harrisburg",        start: edt("2026-05-01","10:45"), round: 1, group: "D" },
  { externalId: "mlsnext-va26-19708", home: "FC Richmond",                    away: "TBD",                           start: edt("2026-05-01","10:45"), round: 1, group: "D" },
  { externalId: "mlsnext-va26-19709", home: "Coppermine SC",                  away: "Virginia Rush",                 start: edt("2026-05-01","10:45"), round: 1, group: "E" },
  { externalId: "mlsnext-va26-19710", home: "Fox Soccer Academy Carolinas",   away: "PDA Hibernian",                 start: edt("2026-05-01","10:45"), round: 1, group: "E" },
  // 12:15pm EDT
  { externalId: "mlsnext-va26-19715", home: "FC DELCO",                       away: "Triangle United SA",            start: edt("2026-05-01","12:15"), round: 1, group: "C" },
  { externalId: "mlsnext-va26-19716", home: "The Football Academy",           away: "The St. James FC",              start: edt("2026-05-01","12:15"), round: 1, group: "C" },
  { externalId: "mlsnext-va26-19717", home: "Queen City Mutiny FC",           away: "PA Classics",                   start: edt("2026-05-01","12:15"), round: 1, group: "F" },
  { externalId: "mlsnext-va26-19718", home: "McLean Youth Soccer",            away: "Trenton City Soccer Club",      start: edt("2026-05-01","12:15"), round: 1, group: "F" },
  // 1:45pm EDT
  { externalId: "mlsnext-va26-19699", home: "Springfield SYC",                away: "Carolina Velocity FC",          start: edt("2026-05-01","13:45"), round: 1, group: "A" },
  { externalId: "mlsnext-va26-19700", home: "Shore FC",   away: "Bethesda SC",                   start: edt("2026-05-01","13:45"), round: 1, group: "A" },
  { externalId: "mlsnext-va26-19701", home: "Virginia Revolution SC",         away: "Players Development Academy",   start: edt("2026-05-01","13:45"), round: 1, group: "H" },
  { externalId: "mlsnext-va26-19702", home: "Sporting Athletic Club",         away: "Charlotte Independence SC",     start: edt("2026-05-01","13:45"), round: 1, group: "H" },
  // 3:15pm EDT
  { externalId: "mlsnext-va26-19723", home: "West Virginia Soccer",           away: "Alexandria SA",                 start: edt("2026-05-01","15:15"), round: 1, group: "B" },
  { externalId: "mlsnext-va26-19724", home: "TBD",                            away: "Carolina Core FC",              start: edt("2026-05-01","15:15"), round: 1, group: "B" },
  { externalId: "mlsnext-va26-19725", home: "Keystone FC",                    away: "Real Futbol Academy",           start: edt("2026-05-01","15:15"), round: 1, group: "G" },
  { externalId: "mlsnext-va26-19726", home: "Wake FC",                        away: "Loudoun Soccer Club",           start: edt("2026-05-01","15:15"), round: 1, group: "G" },
  // 4:45pm EDT
  { externalId: "mlsnext-va26-19731", home: "Ironbound Soccer Club",          away: "Baltimore Armour",              start: edt("2026-05-01","16:45"), round: 1, group: "D" },
  { externalId: "mlsnext-va26-19732", home: "PA Classics Harrisburg",         away: "FC Richmond",                   start: edt("2026-05-01","16:45"), round: 1, group: "D" },
  { externalId: "mlsnext-va26-19733", home: "PDA Hibernian",                  away: "Coppermine SC",                 start: edt("2026-05-01","16:45"), round: 1, group: "E" },
  { externalId: "mlsnext-va26-19734", home: "Virginia Rush",                  away: "Fox Soccer Academy Carolinas",  start: edt("2026-05-01","16:45"), round: 1, group: "E" },
  // 6:15pm EDT
  { externalId: "mlsnext-va26-19739", home: "The St. James FC",               away: "FC DELCO",                      start: edt("2026-05-01","18:15"), round: 1, group: "C" },
  { externalId: "mlsnext-va26-19740", home: "Triangle United SA",             away: "The Football Academy",          start: edt("2026-05-01","18:15"), round: 1, group: "C" },
  { externalId: "mlsnext-va26-19741", home: "Trenton City Soccer Club",       away: "Queen City Mutiny FC",          start: edt("2026-05-01","18:15"), round: 1, group: "F" },
  { externalId: "mlsnext-va26-19742", home: "PA Classics",                    away: "McLean Youth Soccer",           start: edt("2026-05-01","18:15"), round: 1, group: "F" },

  // ─── Saturday May 2 — Round 2 ─────────────────────────────────────────────
  // 9:00am EDT
  { externalId: "mlsnext-va26-19787", home: "Springfield SYC",                away: "Shore FC",  start: edt("2026-05-02","09:00"), round: 2, group: "A" },
  { externalId: "mlsnext-va26-19788", home: "Carolina Velocity FC",           away: "Bethesda SC",                   start: edt("2026-05-02","09:00"), round: 2, group: "A" },
  { externalId: "mlsnext-va26-19789", home: "Players Development Academy",    away: "Charlotte Independence SC",     start: edt("2026-05-02","09:00"), round: 2, group: "H" },
  { externalId: "mlsnext-va26-19790", home: "Virginia Revolution SC",         away: "Sporting Athletic Club",        start: edt("2026-05-02","09:00"), round: 2, group: "H" },
  // 10:30am EDT
  { externalId: "mlsnext-va26-19771", home: "Alexandria SA",                  away: "Carolina Core FC",              start: edt("2026-05-02","10:30"), round: 2, group: "B" },
  { externalId: "mlsnext-va26-19772", home: "West Virginia Soccer",           away: "TBD",                           start: edt("2026-05-02","10:30"), round: 2, group: "B" },
  { externalId: "mlsnext-va26-19773", home: "Real Futbol Academy",            away: "Loudoun Soccer Club",           start: edt("2026-05-02","10:30"), round: 2, group: "G" },
  { externalId: "mlsnext-va26-19774", home: "Keystone FC",                    away: "Wake FC",                       start: edt("2026-05-02","10:30"), round: 2, group: "G" },
  // 12:00pm EDT
  { externalId: "mlsnext-va26-19779", home: "Baltimore Armour",               away: "FC Richmond",                   start: edt("2026-05-02","12:00"), round: 2, group: "D" },
  { externalId: "mlsnext-va26-19780", home: "Ironbound Soccer Club",          away: "PA Classics Harrisburg",        start: edt("2026-05-02","12:00"), round: 2, group: "D" },
  { externalId: "mlsnext-va26-19781", home: "Coppermine SC",                  away: "Fox Soccer Academy Carolinas",  start: edt("2026-05-02","12:00"), round: 2, group: "E" },
  { externalId: "mlsnext-va26-19782", home: "PDA Hibernian",                  away: "Virginia Rush",                 start: edt("2026-05-02","12:00"), round: 2, group: "E" },
  // 1:30pm EDT
  { externalId: "mlsnext-va26-19763", home: "FC DELCO",                       away: "The Football Academy",          start: edt("2026-05-02","13:30"), round: 2, group: "C" },
  { externalId: "mlsnext-va26-19764", home: "The St. James FC",               away: "Triangle United SA",            start: edt("2026-05-02","13:30"), round: 2, group: "C" },
  { externalId: "mlsnext-va26-19765", home: "Queen City Mutiny FC",           away: "McLean Youth Soccer",           start: edt("2026-05-02","13:30"), round: 2, group: "F" },
  { externalId: "mlsnext-va26-19766", home: "Trenton City Soccer Club",       away: "PA Classics",                   start: edt("2026-05-02","13:30"), round: 2, group: "F" },
];

async function main() {
  console.log(`Seeding ${GAMES.length} MLS NEXT U13 AD games...`);
  let upserted = 0;

  for (const g of GAMES) {
    const leagueLabel = `${LEAGUE} · Group ${g.group}`;
    await prisma.$executeRaw`
      INSERT INTO games (
        id, external_id, sport, league,
        home_team, away_team,
        scheduled_start, round, season, status,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${g.externalId},
        'MLSNEXT'::"Sport",
        ${leagueLabel},
        ${g.home},
        ${g.away},
        ${g.start},
        ${g.round},
        ${SEASON},
        'SCHEDULED'::"GameStatus",
        NOW(), NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        home_team      = EXCLUDED.home_team,
        away_team      = EXCLUDED.away_team,
        scheduled_start = EXCLUDED.scheduled_start,
        league         = EXCLUDED.league,
        round          = EXCLUDED.round,
        updated_at     = NOW()
    `;
    upserted++;
  }

  console.log(`✅ Done — ${upserted} games upserted.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
