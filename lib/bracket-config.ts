/**
 * MLS NEXT Virginia Regional U13 Academy Division — Bracket Configuration
 *
 * Actual format (confirmed from mlssoccer.com):
 *   Group Play (May 1–2, 8 groups of 4)
 *   → Quarterfinals (May 3 8am, 4 games)
 *   → Semifinals   (May 3 1pm, 2 games)
 *   → Final        (May 4 8am, 1 game)
 *
 * Only GROUP WINNERS advance — no Round of 16.
 * QF seeding: A1 vs B1 | C1 vs D1 | E1 vs F1 | G1 vs H1
 *
 * modular11 playoff match IDs:
 *   QF:    19819, 19820, 19821, 19822
 *   SF:    19803, 19804
 *   Final: 19832
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

// ─────────────────────────────────────────────────────────────────────────────
// Group Game Schedule (all 48 games, May 1–2)
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupGame {
  id: number;      // modular11 match ID
  home: string;
  away: string;
  group: string;
  round: number;   // 1, 2, or 3
  time: string;    // display time e.g. "7:45 AM"
  day: 1 | 2;      // May 1 or May 2
}

export const GROUP_GAMES: GroupGame[] = [
  // ── May 1 — Round 1 ──────────────────────────────────────────────────────
  { id: 19747, home: "Carolina Velocity FC",          away: "Cedar Stars Academy Monmouth", group: "A", round: 1, time: "7:45 AM",  day: 1 },
  { id: 19748, home: "Bethesda SC",                   away: "Springfield SYC",               group: "A", round: 1, time: "7:45 AM",  day: 1 },
  { id: 19749, home: "Players Development Academy",   away: "Sporting Athletic Club",        group: "H", round: 1, time: "7:45 AM",  day: 1 },
  { id: 19750, home: "Charlotte Independence SC",     away: "Virginia Revolution SC",        group: "H", round: 1, time: "7:45 AM",  day: 1 },
  { id: 19755, home: "Alexandria SA",                 away: "TBD (Group B)",                 group: "B", round: 1, time: "9:15 AM",  day: 1 },
  { id: 19756, home: "Carolina Core FC",              away: "West Virginia Soccer",          group: "B", round: 1, time: "9:15 AM",  day: 1 },
  { id: 19757, home: "Real Futbol Academy",           away: "Wake FC",                       group: "G", round: 1, time: "9:15 AM",  day: 1 },
  { id: 19758, home: "Loudoun Soccer Club",           away: "Keystone FC",                   group: "G", round: 1, time: "9:15 AM",  day: 1 },
  { id: 19707, home: "Baltimore Armour",              away: "PA Classics Harrisburg",        group: "D", round: 1, time: "10:45 AM", day: 1 },
  { id: 19708, home: "FC Richmond",                   away: "TBD (Group D)",                 group: "D", round: 1, time: "10:45 AM", day: 1 },
  { id: 19709, home: "Coppermine SC",                 away: "Virginia Rush",                 group: "E", round: 1, time: "10:45 AM", day: 1 },
  { id: 19710, home: "Fox Soccer Academy Carolinas",  away: "PDA Hibernian",                 group: "E", round: 1, time: "10:45 AM", day: 1 },
  { id: 19715, home: "FC DELCO",                      away: "Triangle United SA",            group: "C", round: 1, time: "12:15 PM", day: 1 },
  { id: 19716, home: "The Football Academy",          away: "The St. James FC",              group: "C", round: 1, time: "12:15 PM", day: 1 },
  { id: 19717, home: "Queen City Mutiny FC",          away: "PA Classics",                   group: "F", round: 1, time: "12:15 PM", day: 1 },
  { id: 19718, home: "McLean Youth Soccer",           away: "Trenton City Soccer Club",      group: "F", round: 1, time: "12:15 PM", day: 1 },
  { id: 19699, home: "Springfield SYC",               away: "Carolina Velocity FC",          group: "A", round: 1, time: "1:45 PM",  day: 1 },
  { id: 19700, home: "Cedar Stars Academy Monmouth",  away: "Bethesda SC",                   group: "A", round: 1, time: "1:45 PM",  day: 1 },
  { id: 19701, home: "Virginia Revolution SC",        away: "Players Development Academy",   group: "H", round: 1, time: "1:45 PM",  day: 1 },
  { id: 19702, home: "Sporting Athletic Club",        away: "Charlotte Independence SC",     group: "H", round: 1, time: "1:45 PM",  day: 1 },
  { id: 19723, home: "West Virginia Soccer",          away: "Alexandria SA",                 group: "B", round: 1, time: "3:15 PM",  day: 1 },
  { id: 19724, home: "TBD (Group B)",                 away: "Carolina Core FC",              group: "B", round: 1, time: "3:15 PM",  day: 1 },
  { id: 19725, home: "Keystone FC",                   away: "Real Futbol Academy",           group: "G", round: 1, time: "3:15 PM",  day: 1 },
  { id: 19726, home: "Wake FC",                       away: "Loudoun Soccer Club",           group: "G", round: 1, time: "3:15 PM",  day: 1 },
  { id: 19731, home: "Ironbound Soccer Club",         away: "Baltimore Armour",              group: "D", round: 1, time: "4:45 PM",  day: 1 },
  { id: 19732, home: "PA Classics Harrisburg",        away: "FC Richmond",                   group: "D", round: 1, time: "4:45 PM",  day: 1 },
  { id: 19733, home: "PDA Hibernian",                 away: "Coppermine SC",                 group: "E", round: 1, time: "4:45 PM",  day: 1 },
  { id: 19734, home: "Virginia Rush",                 away: "Fox Soccer Academy Carolinas",  group: "E", round: 1, time: "4:45 PM",  day: 1 },
  { id: 19739, home: "The St. James FC",              away: "FC DELCO",                      group: "C", round: 1, time: "6:15 PM",  day: 1 },
  { id: 19740, home: "Triangle United SA",            away: "The Football Academy",          group: "C", round: 1, time: "6:15 PM",  day: 1 },
  { id: 19741, home: "Trenton City Soccer Club",      away: "Queen City Mutiny FC",          group: "F", round: 1, time: "6:15 PM",  day: 1 },
  { id: 19742, home: "PA Classics",                   away: "McLean Youth Soccer",           group: "F", round: 1, time: "6:15 PM",  day: 1 },

  // ── May 2 — Round 2 ──────────────────────────────────────────────────────
  { id: 19787, home: "Springfield SYC",               away: "Cedar Stars Academy Monmouth",  group: "A", round: 2, time: "9:00 AM",  day: 2 },
  { id: 19788, home: "Carolina Velocity FC",          away: "Bethesda SC",                   group: "A", round: 2, time: "9:00 AM",  day: 2 },
  { id: 19789, home: "Players Development Academy",   away: "Charlotte Independence SC",     group: "H", round: 2, time: "9:00 AM",  day: 2 },
  { id: 19790, home: "Virginia Revolution SC",        away: "Sporting Athletic Club",        group: "H", round: 2, time: "9:00 AM",  day: 2 },
  { id: 19771, home: "Alexandria SA",                 away: "Carolina Core FC",              group: "B", round: 2, time: "10:30 AM", day: 2 },
  { id: 19772, home: "West Virginia Soccer",          away: "TBD (Group B)",                 group: "B", round: 2, time: "10:30 AM", day: 2 },
  { id: 19773, home: "Real Futbol Academy",           away: "Loudoun Soccer Club",           group: "G", round: 2, time: "10:30 AM", day: 2 },
  { id: 19774, home: "Keystone FC",                   away: "Wake FC",                       group: "G", round: 2, time: "10:30 AM", day: 2 },
  { id: 19779, home: "Baltimore Armour",              away: "FC Richmond",                   group: "D", round: 2, time: "12:00 PM", day: 2 },
  { id: 19780, home: "Ironbound Soccer Club",         away: "PA Classics Harrisburg",        group: "D", round: 2, time: "12:00 PM", day: 2 },
  { id: 19781, home: "Coppermine SC",                 away: "Fox Soccer Academy Carolinas",  group: "E", round: 2, time: "12:00 PM", day: 2 },
  { id: 19782, home: "PDA Hibernian",                 away: "Virginia Rush",                 group: "E", round: 2, time: "12:00 PM", day: 2 },
  { id: 19763, home: "FC DELCO",                      away: "The Football Academy",          group: "C", round: 2, time: "1:30 PM",  day: 2 },
  { id: 19764, home: "The St. James FC",              away: "Triangle United SA",            group: "C", round: 2, time: "1:30 PM",  day: 2 },
  { id: 19765, home: "Queen City Mutiny FC",          away: "McLean Youth Soccer",           group: "F", round: 2, time: "1:30 PM",  day: 2 },
  { id: 19766, home: "Trenton City Soccer Club",      away: "PA Classics",                   group: "F", round: 2, time: "1:30 PM",  day: 2 },
];

/**
 * National MLS NEXT rankings as of April 28, 2026.
 * Source: MLSN Cup Virginia Regional May 1–4 2026 spreadsheet (28Apr update).
 * Lower number = higher rank (e.g., #206 FC DELCO is the top-ranked team).
 */
export const TEAM_RANKINGS: Record<string, number> = {
  // Group A
  "Carolina Velocity FC":          211,
  "Springfield SYC":               380,
  "Cedar Stars Academy Monmouth": 4131,
  "Bethesda SC":                   563,
  // Group B
  "Alexandria SA":                 561,
  "Carolina Core FC":             1120,
  "West Virginia Soccer":         1697,
  // Group C
  "FC DELCO":                      206,
  "The Football Academy":          778,
  "The St. James FC":              734,
  "Triangle United SA":           1788,
  // Group D
  "Baltimore Armour":              469,
  "Ironbound Soccer Club":         397,
  "FC Richmond":                   918,
  "PA Classics Harrisburg":       2078,
  // Group E
  "Coppermine SC":                 319,
  "PDA Hibernian":                 866,
  "Fox Soccer Academy Carolinas":  666,
  "Virginia Rush":                2376,
  // Group F
  "McLean Youth Soccer":           615,
  "Trenton City Soccer Club":      995,
  "Queen City Mutiny FC":          738,
  "PA Classics":                  1910,
  // Group G
  "Loudoun Soccer Club":           487,
  "Real Futbol Academy":           897,
  "Wake FC":                      1908,
  "Keystone FC":                  1940,
  // Group H
  "Charlotte Independence SC":     750,
  "Players Development Academy":   560,
  "Virginia Revolution SC":       1320,
  "Sporting Athletic Club":       2123,
};

/**
 * QF seeding — Wildcard Cross-Group Ranking Algorithm (per MLS NEXT rules).
 *
 * All 8 group winners are ranked #1–#8 by:
 *   1. Points Per Match (PPM)
 *   2. Goal Difference Per Match
 *   3. Goals For Per Match
 *   4. Fewest Disciplinary Points
 *
 * Fixed bracket: #1 vs #8 | #4 vs #5 | #3 vs #6 | #2 vs #7
 * (higher seed gets favorable draw — seedings NOT known until after group play)
 *
 * modular11 match IDs map to QF slots 1–4 in bracket order:
 *   Slot 1 → 19819 | Slot 2 → 19820 | Slot 3 → 19821 | Slot 4 → 19822
 */
export const QF_SLOTS: { id: number; homeGroup: string; awayGroup: string; label: string }[] = [
  { id: 1, homeGroup: "A", awayGroup: "H", label: "Group A Winner vs Group H Winner" },
  { id: 2, homeGroup: "D", awayGroup: "E", label: "Group D Winner vs Group E Winner" },
  { id: 3, homeGroup: "C", awayGroup: "F", label: "Group C Winner vs Group F Winner" },
  { id: 4, homeGroup: "B", awayGroup: "G", label: "Group B Winner vs Group G Winner" },
];

/** @deprecated — use QF_SLOTS. Kept for any legacy references. */
export const QF_SEEDS = QF_SLOTS.map((s) => ({
  id: s.id,
  home: `GRP${s.homeGroup}`,
  away: `GRP${s.awayGroup}`,
}));

export const SF_SEEDS: { id: number; homeQF: number; awayQF: number }[] = [
  { id: 1, homeQF: 1, awayQF: 2 },
  { id: 2, homeQF: 3, awayQF: 4 },
];

/** Points per correct pick */
export const ROUND_POINTS = {
  groupFirst:  1,
  qf:          2,
  sf:          4,
  final:       8,
  scoreBonus:  1,  // bonus per correct exact score prediction (QF/SF/Final)
};

/** Maximum possible score: 8+8+8+8 + 7 bonus = 39 */
export const MAX_SCORE =
  ROUND_POINTS.groupFirst * 8 +
  ROUND_POINTS.qf         * 4 +
  ROUND_POINTS.sf         * 2 +
  ROUND_POINTS.final      +
  ROUND_POINTS.scoreBonus * 7;  // 4 QF + 2 SF + 1 Final

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Predicted or actual score for a single match (stored as strings for input flexibility) */
export interface MatchScore {
  home: string;
  away: string;
}

export interface BracketPicks {
  groups: Record<string, { first: string; second?: string }>;
  qf: Record<string, string>;        // slotId (1-4) → team name
  sf: Record<string, string>;        // matchId (1-2) → team name
  final: string;
  qfScores:         Record<string, MatchScore>;  // slotId → predicted score
  sfScores:         Record<string, MatchScore>;  // matchId → predicted score
  finalScore:       MatchScore;
  /** Optional group game score predictions — used as tiebreaker only, keyed by match ID */
  groupGameScores?: Record<number, MatchScore>;
}

export const EMPTY_SCORE: MatchScore = { home: "", away: "" };

export const EMPTY_PICKS: BracketPicks = {
  groups:          Object.fromEntries(GROUP_KEYS.map((g) => [g, { first: "" }])),
  qf:              {},
  sf:              {},
  final:           "",
  qfScores:        {},
  sfScores:        {},
  finalScore:      { home: "", away: "" },
  groupGameScores: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** All 8 group winners the user has predicted (empty string if not yet picked) */
export function getGroupWinners(picks: BracketPicks): string[] {
  return GROUP_KEYS.map((g) => picks.groups[g]?.first ?? "");
}

/** @deprecated — QF teams are not deterministic from group letters; use getGroupWinners instead */
export function resolveToken(token: string, picks: BracketPicks): string {
  const group = token[0];
  const place = parseInt(token[1]);
  if (!picks.groups[group]) return token;
  return place === 1 ? picks.groups[group].first : (picks.groups[group].second ?? "");
}

export function getQFTeams(matchId: number, picks: BracketPicks): [string, string] {
  const slot = QF_SLOTS.find((s) => s.id === matchId);
  if (!slot) return ["", ""];
  return [
    picks.groups[slot.homeGroup]?.first || "",
    picks.groups[slot.awayGroup]?.first || "",
  ];
}

export function getSFTeams(matchId: number, picks: BracketPicks): [string, string] {
  const seed = SF_SEEDS.find((s) => s.id === matchId)!;
  return [picks.qf[String(seed.homeQF)] || "", picks.qf[String(seed.awayQF)] || ""];
}

export function getFinalTeams(picks: BracketPicks): [string, string] {
  return [picks.sf["1"] || "", picks.sf["2"] || ""];
}

export function isComplete(picks: BracketPicks): boolean {
  const groupsDone = GROUP_KEYS.every((g) => !!picks.groups[g]?.first);
  const qfDone     = QF_SLOTS.every((s) => picks.qf[String(s.id)]);
  const sfDone     = SF_SEEDS.every((s) => picks.sf[String(s.id)]);
  return groupsDone && qfDone && sfDone && !!picks.final;
}

/** 8 group winners + 4 QF + 2 SF + 1 Final = 15 total picks */
export function pickProgress(picks: BracketPicks): { made: number; total: number } {
  const total = 8 + 4 + 2 + 1;
  let made = 0;
  GROUP_KEYS.forEach((g) => { if (picks.groups[g]?.first) made++; });
  QF_SLOTS.forEach((s)    => { if (picks.qf[String(s.id)]) made++; });
  SF_SEEDS.forEach((s)    => { if (picks.sf[String(s.id)]) made++; });
  if (picks.final) made++;
  return { made, total };
}
