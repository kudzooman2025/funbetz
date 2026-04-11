/**
 * MLS NEXT Virginia Regional U13 Academy Division — Bracket Configuration
 *
 * Group Play (May 1–2) → Round of 16 → Quarterfinals → Semifinals → Final
 *
 * Seeding:
 *   Top half:    R16 #1 A1vB2 | #2 C1vD2 | #3 E1vF2 | #4 G1vH2
 *   Bottom half: R16 #5 B1vA2 | #6 D1vC2 | #7 F1vE2 | #8 H1vG2
 *   QF:   #1 W1vW2 | #2 W3vW4 | #3 W5vW6 | #4 W7vW8
 *   SF:   #1 WQF1vWQF2 | #2 WQF3vWQF4
 *   Final: WSF1 v WSF2
 */

export const BRACKET_ID = "va26-u13-ad";

export const BRACKET_LOCK_TIME = new Date("2026-05-01T11:45:00Z"); // 7:45am EDT

export const GROUPS: Record<string, string[]> = {
  A: ["Carolina Velocity FC", "Cedar Stars Academy Monmouth", "Bethesda SC", "Springfield SYC"],
  B: ["Alexandria SA", "TBD (Group B)", "Carolina Core FC", "West Virginia Soccer"],
  C: ["FC DELCO", "Triangle United SA", "The Football Academy", "The St. James FC"],
  D: ["Baltimore Armour", "PA Classics Harrisburg", "FC Richmond", "Ironbound Soccer Club"],
  E: ["Coppermine SC", "Virginia Rush", "Fox Soccer Academy Carolinas", "PDA Hibernian"],
  F: ["McLean Youth Soccer", "Trenton City Soccer Club", "Queen City Mutiny FC", "PA Classics"],
  G: ["Real Futbol Academy", "Wake FC", "Loudoun Soccer Club", "Keystone FC"],
  H: ["Charlotte Independence SC", "Virginia Revolution SC", "Players Development Academy", "Sporting Athletic Club"],
};

export const GROUP_KEYS = Object.keys(GROUPS) as string[];

/** R16 matchup seedings expressed as group/place tokens */
export const R16_SEEDS: { id: number; home: string; away: string }[] = [
  { id: 1, home: "A1", away: "B2" },
  { id: 2, home: "C1", away: "D2" },
  { id: 3, home: "E1", away: "F2" },
  { id: 4, home: "G1", away: "H2" },
  { id: 5, home: "B1", away: "A2" },
  { id: 6, home: "D1", away: "C2" },
  { id: 7, home: "F1", away: "E2" },
  { id: 8, home: "H1", away: "G2" },
];

export const QF_SEEDS: { id: number; homeR16: number; awayR16: number }[] = [
  { id: 1, homeR16: 1, awayR16: 2 },
  { id: 2, homeR16: 3, awayR16: 4 },
  { id: 3, homeR16: 5, awayR16: 6 },
  { id: 4, homeR16: 7, awayR16: 8 },
];

export const SF_SEEDS: { id: number; homeQF: number; awayQF: number }[] = [
  { id: 1, homeQF: 1, awayQF: 2 },
  { id: 2, homeQF: 3, awayQF: 4 },
];

/** Points awarded per round */
export const ROUND_POINTS = {
  groupFirst: 1,
  groupSecond: 1,
  r16: 2,
  qf: 4,
  sf: 8,
  final: 16,
};

/** Maximum possible score */
export const MAX_SCORE =
  ROUND_POINTS.groupFirst * 8 +
  ROUND_POINTS.groupSecond * 8 +
  ROUND_POINTS.r16 * 8 +
  ROUND_POINTS.qf * 4 +
  ROUND_POINTS.sf * 2 +
  ROUND_POINTS.final;
// = 8 + 8 + 16 + 16 + 16 + 16 = 80

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BracketPicks {
  groups: Record<string, { first: string; second: string }>;
  r16: Record<string, string>;   // matchId (1-8) → team name
  qf: Record<string, string>;    // matchId (1-4) → team name
  sf: Record<string, string>;    // matchId (1-2) → team name
  final: string;                 // champion
}

export const EMPTY_PICKS: BracketPicks = {
  groups: Object.fromEntries(GROUP_KEYS.map((g) => [g, { first: "", second: "" }])),
  r16: {},
  qf: {},
  sf: {},
  final: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: resolve "A1" / "B2" tokens → team name from user's picks
// ─────────────────────────────────────────────────────────────────────────────

export function resolveToken(token: string, picks: BracketPicks): string {
  const group = token[0];          // "A"
  const place = parseInt(token[1]); // 1 or 2
  if (!picks.groups[group]) return token;
  return place === 1 ? picks.groups[group].first : picks.groups[group].second;
}

export function getR16Teams(
  matchId: number,
  picks: BracketPicks
): [string, string] {
  const seed = R16_SEEDS.find((s) => s.id === matchId)!;
  return [resolveToken(seed.home, picks), resolveToken(seed.away, picks)];
}

export function getQFTeams(
  matchId: number,
  picks: BracketPicks
): [string, string] {
  const seed = QF_SEEDS.find((s) => s.id === matchId)!;
  const home = picks.r16[String(seed.homeR16)] || "";
  const away = picks.r16[String(seed.awayR16)] || "";
  return [home, away];
}

export function getSFTeams(
  matchId: number,
  picks: BracketPicks
): [string, string] {
  const seed = SF_SEEDS.find((s) => s.id === matchId)!;
  const home = picks.qf[String(seed.homeQF)] || "";
  const away = picks.qf[String(seed.awayQF)] || "";
  return [home, away];
}

export function getFinalTeams(picks: BracketPicks): [string, string] {
  return [picks.sf["1"] || "", picks.sf["2"] || ""];
}

/** Returns true if all required picks have been made */
export function isComplete(picks: BracketPicks): boolean {
  const groupsDone = GROUP_KEYS.every(
    (g) => picks.groups[g]?.first && picks.groups[g]?.second && picks.groups[g].first !== picks.groups[g].second
  );
  const r16Done = R16_SEEDS.every((s) => picks.r16[String(s.id)]);
  const qfDone = QF_SEEDS.every((s) => picks.qf[String(s.id)]);
  const sfDone = SF_SEEDS.every((s) => picks.sf[String(s.id)]);
  const finalDone = !!picks.final;
  return groupsDone && r16Done && qfDone && sfDone && finalDone;
}

/** Count of picks made out of total possible */
export function pickProgress(picks: BracketPicks): { made: number; total: number } {
  let made = 0;
  const total = 8 * 2 + 8 + 4 + 2 + 1; // 32 group picks + 15 knockout picks = 31... but groups have first+second = 16 group + 15 knockout = 31

  GROUP_KEYS.forEach((g) => {
    if (picks.groups[g]?.first) made++;
    if (picks.groups[g]?.second) made++;
  });
  R16_SEEDS.forEach((s) => { if (picks.r16[String(s.id)]) made++; });
  QF_SEEDS.forEach((s) => { if (picks.qf[String(s.id)]) made++; });
  SF_SEEDS.forEach((s) => { if (picks.sf[String(s.id)]) made++; });
  if (picks.final) made++;

  return { made, total };
}
