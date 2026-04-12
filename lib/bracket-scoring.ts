/**
 * Bracket scoring utilities.
 *
 * Compares a user's BracketPicks against stored BracketResult rows
 * and returns the total score.
 */

import {
  ROUND_POINTS,
  QF_SLOTS,
  SF_SEEDS,
  GROUP_KEYS,
  type BracketPicks,
} from "@/lib/bracket-config";

/**
 * Shape of results as loaded from the DB (BracketResult rows keyed by round+key).
 * All values are team name strings or empty string if not yet available.
 */
export interface StoredResults {
  /** group A–H first-place winners */
  groupFirst: Record<string, string>;
  /** group A–H second-place finishers */
  groupSecond: Record<string, string>;
  /** QF winners by seed key "1"–"4" */
  qf: Record<string, string>;
  /** SF winners by seed key "1"–"2" */
  sf: Record<string, string>;
  /** Final winner (empty string if not played yet) */
  final: string;
}

/**
 * Convert raw BracketResult DB rows into a typed StoredResults object.
 */
export function buildStoredResults(
  rows: { round: string; key: string; winner: string }[]
): StoredResults {
  const groupFirst: Record<string, string> = {};
  const groupSecond: Record<string, string> = {};
  const qf: Record<string, string> = {};
  const sf: Record<string, string> = {};
  let final = "";

  for (const row of rows) {
    switch (row.round) {
      case "group":
        groupFirst[row.key] = row.winner;
        break;
      case "group2":
        groupSecond[row.key] = row.winner;
        break;
      case "qf":
        qf[row.key] = row.winner;
        break;
      case "sf":
        sf[row.key] = row.winner;
        break;
      case "final":
        final = row.winner;
        break;
    }
  }

  return { groupFirst, groupSecond, qf, sf, final };
}

/**
 * Calculate a bracket score for one user's picks against official results.
 *
 * Scoring:
 *   - Correct group 1st place  → 1 pt × 8 groups  (max  8)
 *   - Correct group 2nd place  → 1 pt × 8 groups  (max  8)
 *   - Correct QF winner        → 2 pts × 4 matches (max  8)
 *   - Correct SF winner        → 4 pts × 2 matches (max  8)
 *   - Correct final winner     → 8 pts              (max  8)
 *                                               TOTAL max 40
 */
export function calculateScore(
  picks: BracketPicks,
  results: StoredResults
): number {
  let score = 0;

  // Group stage — only group winners scored
  for (const group of GROUP_KEYS) {
    if (
      results.groupFirst[group] &&
      picks.groups[group]?.first === results.groupFirst[group]
    ) {
      score += ROUND_POINTS.groupFirst;
    }
  }

  // Quarterfinals
  for (const slot of QF_SLOTS) {
    const key = String(slot.id);
    if (results.qf[key] && picks.qf[key] === results.qf[key]) {
      score += ROUND_POINTS.qf;
    }
  }

  // Semifinals
  for (const seed of SF_SEEDS) {
    const key = String(seed.id);
    if (results.sf[key] && picks.sf[key] === results.sf[key]) {
      score += ROUND_POINTS.sf;
    }
  }

  // Final
  if (results.final && picks.final === results.final) {
    score += ROUND_POINTS.final;
  }

  return score;
}

/**
 * How many results are currently available (useful for UI progress display).
 */
export function resultProgress(results: StoredResults): {
  groups: number;
  qf: number;
  sf: number;
  final: number;
} {
  return {
    groups: GROUP_KEYS.filter((g) => results.groupFirst[g]).length,
    qf: QF_SLOTS.filter((s) => results.qf[String(s.id)]).length,
    sf: SF_SEEDS.filter((s) => results.sf[String(s.id)]).length,
    final: results.final ? 1 : 0,
  };
}
