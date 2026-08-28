/**
 * EACF tunables. Everything here is a seed value, not a discovered one —
 * see EACF_SPEC.md. The line coefficients in particular are guesses until
 * there are ~20-30 completed games to regress actual margin against.
 */

/** Line bounds, in points. Magnitude only; the stored line is signed. */
export const MIN_LINE = 0.5;
export const MAX_LINE = 30;

/**
 * Ceiling on submissions needed before a consensus line publishes. The actual
 * quorum is relative to how many people could submit — see quorumFor.
 */
export const LINE_QUORUM_CAP = 4;

/**
 * Below this many eligible submitters there is no consensus to take, only one
 * person's opinion on a game they may then bet. Use the algorithmic line.
 */
export const MIN_ELIGIBLE_FOR_CONSENSUS = 2;

/**
 * How many submissions publish a line, given how many people are eligible to
 * submit on that game.
 *
 * Eligibility is: coaches with a FunBetz account, minus the two playing. Not
 * every coach in the dynasty will sign up — some never will — and a fixed
 * quorum of 4 would be unreachable in a league where only a handful have
 * accounts, so every game would silently fall back to the algorithmic line.
 * A majority of whoever can actually submit keeps consensus meaningful at any
 * league size.
 *
 * Returns null when consensus isn't possible and the algorithmic line should
 * be used instead.
 */
export function quorumFor(eligibleCount: number): number | null {
  if (eligibleCount < MIN_ELIGIBLE_FOR_CONSENSUS) return null;
  return Math.min(LINE_QUORUM_CAP, Math.max(2, Math.ceil(eligibleCount / 2)));
}

/** Peer raters needed before consensus replaces a coach's seeded rank. */
export const MIN_RATERS = 3;

/** Peer rating scale. */
export const MIN_RATING = 1;
export const MAX_RATING = 10;

/** Line algorithm seeds. */
export const COACH_STEP = 1.2; // per point of net unit matchup (1-10 scale)
export const COACHING_STEP = 1.5; // per point of in-game coaching gap
export const TEAM_STEP = 0.5; // per point of net team matchup (0-99 scale)
export const HOME_FIELD = 2.5;

/** In-game coaching counts roughly double any single unit metric. */
export const COACHING_WEIGHT = 2;

/** Line movement: this much net imbalance shifts the line half a point. */
export const MOVE_STEP_BETZ = 100;
/** Total drift cap from the published line, in points. */
export const MAX_MOVE = 3.0;

/** -110 juice: risk 55 to win 50. */
export const VIG_DIVISOR = 1.1;

/** Lines live on the half-point. */
export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Clamp a signed line to the legal range. A consensus landing inside ±MIN_LINE
 * snaps outward rather than to zero — there are no pick'em games.
 */
export function clampLine(signed: number): number {
  const rounded = roundToHalf(signed);
  const magnitude = Math.abs(rounded);
  if (magnitude < MIN_LINE) return rounded < 0 ? -MIN_LINE : MIN_LINE;
  if (magnitude > MAX_LINE) return rounded < 0 ? -MAX_LINE : MAX_LINE;
  return rounded;
}

/**
 * The published line from a set of blind submissions: a trimmed mean, dropping
 * the highest and lowest so one deliberately wild number cannot drag the line.
 *
 * Trimming needs something left over to average. With fewer than three
 * submissions, dropping both ends would leave one value or none, so small sets
 * use a plain mean — which is the honest thing to do rather than pretending to
 * a robustness the sample size cannot support.
 */
export function consensusFrom(signedLines: number[]): number | null {
  if (signedLines.length === 0) return null;
  const sorted = [...signedLines].sort((a, b) => a - b);
  const kept = sorted.length >= 3 ? sorted.slice(1, -1) : sorted;
  const mean = kept.reduce((sum, n) => sum + n, 0) / kept.length;
  return clampLine(mean);
}

/** Winnings on a settled bet, exclusive of the returned stake. */
export function payoutFor(stake: number): number {
  return Math.round(stake / VIG_DIVISOR);
}
