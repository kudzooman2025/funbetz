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
  GROUP_GAMES,
  type BracketPicks,
} from "@/lib/bracket-config";

/** Parse a "home-away" score string (e.g. "2-1") into numbers, or null if invalid */
function parseScore(s: string): { home: number; away: number } | null {
  const parts = s.split("-");
  if (parts.length !== 2) return null;
  const home = parseInt(parts[0], 10);
  const away = parseInt(parts[1], 10);
  if (isNaN(home) || isNaN(away)) return null;
  return { home, away };
}

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
  /** Actual QF scores stored as "home-away" strings e.g. "2-1" */
  qfScores: Record<string, string>;
  /** Actual SF scores */
  sfScores: Record<string, string>;
  /** Actual Final score */
  finalScore: string;
  /** Actual group game scores keyed by match ID string */
  groupGameScores: Record<string, string>;
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
  const qfScores: Record<string, string> = {};
  const sfScores: Record<string, string> = {};
  let finalScore = "";

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
      case "qf_score":
        qfScores[row.key] = row.winner;  // stored as "home-away"
        break;
      case "sf_score":
        sfScores[row.key] = row.winner;
        break;
      case "final_score":
        finalScore = row.winner;
        break;
    }
  }

  const groupGameScores: Record<string, string> = {};
  // group game scores stored as round="group_score", key=matchId
  for (const row of rows) {
    if (row.round === "group_score") {
      groupGameScores[row.key] = row.winner;
    }
  }

  return { groupFirst, groupSecond, qf, sf, final, qfScores, sfScores, finalScore, groupGameScores };
}

/**
 * Calculate a bracket score for one user's picks against official results.
 *
 * Scoring:
 *   - Correct group 1st place  → 1 pt × 8 groups  (max  8)
 *   - Correct QF winner        → 2 pts × 4 matches (max  8)
 *   - Correct SF winner        → 4 pts × 2 matches (max  8)
 *   - Correct final winner     → 8 pts              (max  8)
 *   - Correct exact score      → 1 pt × 7 matches  (max  7)
 *                                               TOTAL max 39
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
    // Exact score bonus
    const actualScore = results.qfScores[key] ? parseScore(results.qfScores[key]) : null;
    const pickedScore = picks.qfScores?.[key];
    if (actualScore && pickedScore?.home !== "" && pickedScore?.away !== "") {
      if (
        Number(pickedScore?.home) === actualScore.home &&
        Number(pickedScore?.away) === actualScore.away
      ) {
        score += ROUND_POINTS.scoreBonus;
      }
    }
  }

  // Semifinals
  for (const seed of SF_SEEDS) {
    const key = String(seed.id);
    if (results.sf[key] && picks.sf[key] === results.sf[key]) {
      score += ROUND_POINTS.sf;
    }
    // Exact score bonus
    const actualScore = results.sfScores[key] ? parseScore(results.sfScores[key]) : null;
    const pickedScore = picks.sfScores?.[key];
    if (actualScore && pickedScore?.home !== "" && pickedScore?.away !== "") {
      if (
        Number(pickedScore?.home) === actualScore.home &&
        Number(pickedScore?.away) === actualScore.away
      ) {
        score += ROUND_POINTS.scoreBonus;
      }
    }
  }

  // Final
  if (results.final && picks.final === results.final) {
    score += ROUND_POINTS.final;
  }
  // Final exact score bonus
  const actualFinalScore = results.finalScore ? parseScore(results.finalScore) : null;
  const pickedFinalScore = picks.finalScore;
  if (actualFinalScore && pickedFinalScore?.home !== "" && pickedFinalScore?.away !== "") {
    if (
      Number(pickedFinalScore?.home) === actualFinalScore.home &&
      Number(pickedFinalScore?.away) === actualFinalScore.away
    ) {
      score += ROUND_POINTS.scoreBonus;
    }
  }

  return score;
}

/**
 * Count how many group game scores the user predicted correctly.
 * Used as a tiebreaker — does not affect the main score.
 */
export function countGroupScoreTiebreakers(
  picks: BracketPicks,
  results: StoredResults
): number {
  let count = 0;
  for (const game of GROUP_GAMES) {
    const key = String(game.id);
    const actual = results.groupGameScores[key] ? parseScore(results.groupGameScores[key]) : null;
    const predicted = picks.groupGameScores?.[game.id];
    if (actual && predicted && predicted.home !== "" && predicted.away !== "") {
      if (Number(predicted.home) === actual.home && Number(predicted.away) === actual.away) {
        count++;
      }
    }
  }
  return count;
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
