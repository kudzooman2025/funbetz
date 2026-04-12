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
export const QF_SLOTS: { id: number; highSeed: number; lowSeed: number; label: string }[] = [
  { id: 1, highSeed: 1, lowSeed: 8, label: "#1 Seed vs #8 Seed" },
  { id: 2, highSeed: 4, lowSeed: 5, label: "#4 Seed vs #5 Seed" },
  { id: 3, highSeed: 3, lowSeed: 6, label: "#3 Seed vs #6 Seed" },
  { id: 4, highSeed: 2, lowSeed: 7, label: "#2 Seed vs #7 Seed" },
];

/** @deprecated — use QF_SLOTS. Kept for any legacy references. */
export const QF_SEEDS = QF_SLOTS.map((s) => ({
  id: s.id,
  home: `SEED${s.highSeed}`,
  away: `SEED${s.lowSeed}`,
}));

export const SF_SEEDS: { id: number; homeQF: number; awayQF: number }[] = [
  { id: 1, homeQF: 1, awayQF: 2 },
  { id: 2, homeQF: 3, awayQF: 4 },
];

/** Points per correct pick */
export const ROUND_POINTS = {
  groupFirst:  1,
  groupSecond: 1,
  qf:          2,
  sf:          4,
  final:       8,
};

/** Maximum possible score: 8+8+8+8+8 = 40 */
export const MAX_SCORE =
  ROUND_POINTS.groupFirst  * 8 +
  ROUND_POINTS.groupSecond * 8 +
  ROUND_POINTS.qf          * 4 +
  ROUND_POINTS.sf          * 2 +
  ROUND_POINTS.final;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BracketPicks {
  groups: Record<string, { first: string; second: string }>;
  qf: Record<string, string>;   // matchId (1-4) → team name
  sf: Record<string, string>;   // matchId (1-2) → team name
  final: string;
}

export const EMPTY_PICKS: BracketPicks = {
  groups: Object.fromEntries(GROUP_KEYS.map((g) => [g, { first: "", second: "" }])),
  qf: {},
  sf: {},
  final: "",
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
  return place === 1 ? picks.groups[group].first : picks.groups[group].second;
}

/** @deprecated — use QF_SLOTS + getGroupWinners */
export function getQFTeams(_matchId: number, _picks: BracketPicks): [string, string] {
  return ["", ""];
}

export function getSFTeams(matchId: number, picks: BracketPicks): [string, string] {
  const seed = SF_SEEDS.find((s) => s.id === matchId)!;
  return [picks.qf[String(seed.homeQF)] || "", picks.qf[String(seed.awayQF)] || ""];
}

export function getFinalTeams(picks: BracketPicks): [string, string] {
  return [picks.sf["1"] || "", picks.sf["2"] || ""];
}

export function isComplete(picks: BracketPicks): boolean {
  const groupsDone = GROUP_KEYS.every(
    (g) =>
      picks.groups[g]?.first &&
      picks.groups[g]?.second &&
      picks.groups[g].first !== picks.groups[g].second
  );
  const qfDone = QF_SLOTS.every((s) => picks.qf[String(s.id)]);
  const sfDone = SF_SEEDS.every((s) => picks.sf[String(s.id)]);
  return groupsDone && qfDone && sfDone && !!picks.final;
}

/** 8×2 group picks + 4 QF + 2 SF + 1 Final = 23 total */
export function pickProgress(picks: BracketPicks): { made: number; total: number } {
  const total = 8 * 2 + 4 + 2 + 1;
  let made = 0;
  GROUP_KEYS.forEach((g) => {
    if (picks.groups[g]?.first)  made++;
    if (picks.groups[g]?.second) made++;
  });
  QF_SLOTS.forEach((s) => { if (picks.qf[String(s.id)]) made++; });
  SF_SEEDS.forEach((s) => { if (picks.sf[String(s.id)]) made++; });
  if (picks.final) made++;
  return { made, total };
}
