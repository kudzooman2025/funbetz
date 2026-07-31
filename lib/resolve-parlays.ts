/**
 * Shared parlay resolution engine.
 *
 * Used by both /api/cron/resolve-parlays and /api/admin/resolve-parlays so
 * there is exactly ONE copy of the payout algorithm.
 *
 * Rules:
 *  - A leg WINS when the picked team outscored the opponent.
 *  - A tied final score (possible in NFL after OT) is a PUSH, not a loss.
 *  - A CANCELLED or POSTPONED game is a PUSH (the leg is voided).
 *  - Pushed legs are dropped and the multiplier is recomputed from the
 *    remaining leg count (a 4-leg parlay with one push pays as 3-leg).
 *  - If fewer than MIN_PARLAY_GAMES legs remain after pushes and none lost,
 *    the parlay is voided (CANCELLED) and the stake refunded.
 *  - Any lost leg loses the whole parlay (standard parlay rules).
 *  - Wallet payouts use atomic increments (never read-then-write) and are
 *    clamped to WALLET_MAX in a second guarded update.
 *  - Leaderboard rows are upserted so users without a row can't fail the run.
 */

import { WALLET_MAX, MULTIPLIERS, MIN_PARLAY_GAMES } from "./constants";
import type { PrismaClient } from "@/generated/prisma/client";

const RESOLVE_DELAY_HOURS = 1;

export interface ResolveResults {
  resolved: number;
  won: number;
  lost: number;
  refunded: number;
  errors: string[];
}

type LegInput = {
  pickedTeam: string;
  gameStatus: string; // GameStatus: SCHEDULED | IN_PROGRESS | COMPLETED | POSTPONED | CANCELLED
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type LegResult = "WON" | "LOST" | "PUSH";

export interface ParlayOutcome {
  /** null = cannot be resolved yet (scores missing) */
  legResults: LegResult[] | null;
  status: "WON" | "LOST" | "CANCELLED";
  /** Multiplier actually applied after dropping pushes (0 when lost/refunded) */
  effectiveMultiplier: number;
  payoutAmount: number;
  walletAdjustment: number;
  leaderboardAdjustment: number;
}

/**
 * Pure payout math — no database access, unit-testable.
 * Assumes every leg's game is in a terminal state (COMPLETED / CANCELLED /
 * POSTPONED). Returns legResults: null when a COMPLETED game has no scores.
 */
export function computeParlayOutcome(
  legs: LegInput[],
  betAmount: number
): ParlayOutcome | null {
  const legResults: LegResult[] = [];

  for (const leg of legs) {
    if (leg.gameStatus === "CANCELLED" || leg.gameStatus === "POSTPONED") {
      legResults.push("PUSH");
      continue;
    }
    // COMPLETED
    if (leg.homeScore === null || leg.awayScore === null) {
      return null; // scores not available yet — cannot resolve
    }
    if (leg.homeScore === leg.awayScore) {
      legResults.push("PUSH"); // tie (NFL OT can end tied)
      continue;
    }
    const winner = leg.homeScore > leg.awayScore ? leg.homeTeam : leg.awayTeam;
    legResults.push(winner === leg.pickedTeam ? "WON" : "LOST");
  }

  const anyLost = legResults.includes("LOST");
  const liveLegs = legResults.filter((r) => r !== "PUSH").length;

  if (anyLost) {
    return {
      legResults,
      status: "LOST",
      effectiveMultiplier: 0,
      payoutAmount: 0,
      walletAdjustment: 0,
      leaderboardAdjustment: -betAmount,
    };
  }

  if (liveLegs < MIN_PARLAY_GAMES) {
    // Too many pushes to grade as a parlay — void the ticket, refund stake.
    return {
      legResults,
      status: "CANCELLED",
      effectiveMultiplier: 0,
      payoutAmount: 0,
      walletAdjustment: betAmount,
      leaderboardAdjustment: 0,
    };
  }

  // All live legs won — recompute the multiplier from the remaining leg count.
  const effectiveMultiplier = MULTIPLIERS[liveLegs];
  const payoutAmount = Math.round(betAmount * effectiveMultiplier);
  return {
    legResults,
    status: "WON",
    effectiveMultiplier,
    payoutAmount,
    walletAdjustment: payoutAmount,
    leaderboardAdjustment: payoutAmount - betAmount,
  };
}

/** A game is terminal when it can no longer produce a (different) result. */
function isTerminal(status: string): boolean {
  return (
    status === "COMPLETED" || status === "CANCELLED" || status === "POSTPONED"
  );
}

export async function resolvePendingParlays(
  prisma: PrismaClient
): Promise<ResolveResults> {
  const results: ResolveResults = {
    resolved: 0,
    won: 0,
    lost: 0,
    refunded: 0,
    errors: [],
  };

  try {
    const pendingParlays = await prisma.parlay.findMany({
      where: { status: "PENDING" },
      include: { parlayGames: { include: { game: true } } },
    });

    const delayMs = RESOLVE_DELAY_HOURS * 60 * 60 * 1000;

    for (const parlay of pendingParlays) {
      try {
        // Every leg must be in a terminal state (completed, cancelled, or
        // postponed). A postponed game that later gets rescheduled flips back
        // to SCHEDULED on resync, which keeps the parlay pending until played.
        const allTerminal = parlay.parlayGames.every((pg) =>
          isTerminal(pg.game.status)
        );
        if (!allTerminal) continue;

        // Wait RESOLVE_DELAY after the last game finished before paying out
        // (protects against late score corrections). Cancelled/postponed games
        // have no completedAt — for those, wait relative to scheduled start.
        const latestSettledAt = parlay.parlayGames.reduce((latest, pg) => {
          const t = pg.game.completedAt ?? pg.game.scheduledStart;
          return t > latest ? t : latest;
        }, new Date(0));
        if (Date.now() - latestSettledAt.getTime() < delayMs) continue;

        const outcome = computeParlayOutcome(
          parlay.parlayGames.map((pg) => ({
            pickedTeam: pg.pickedTeam,
            gameStatus: pg.game.status,
            homeTeam: pg.game.homeTeam,
            awayTeam: pg.game.awayTeam,
            homeScore: pg.game.homeScore,
            awayScore: pg.game.awayScore,
          })),
          parlay.betAmount
        );

        // Scores missing on a completed game — skip, resync will fill them in.
        if (!outcome || !outcome.legResults) continue;
        const legResults = outcome.legResults;

        await prisma.$transaction(async (tx) => {
          // Atomically claim the parlay (prevents double resolution).
          const claimed = await tx.parlay.updateMany({
            where: { id: parlay.id, status: "PENDING" },
            data: { status: outcome.status, resolvedAt: new Date() },
          });
          if (claimed.count === 0) return;

          // Record per-leg results (WON / LOST / PUSH).
          for (let i = 0; i < parlay.parlayGames.length; i++) {
            await tx.parlayGame.update({
              where: { id: parlay.parlayGames[i].id },
              data: { result: legResults[i] },
            });
          }

          await tx.parlayResult.create({
            data: {
              parlayId: parlay.id,
              payoutAmount: outcome.payoutAmount,
              leaderboardAdjustment: outcome.leaderboardAdjustment,
              walletAdjustment: outcome.walletAdjustment,
            },
          });

          // Credit the wallet with an ATOMIC increment (a read-then-absolute-
          // write would silently erase concurrent stake deductions), then
          // clamp to WALLET_MAX in a second guarded update.
          if (outcome.walletAdjustment > 0) {
            await tx.user.update({
              where: { id: parlay.userId },
              data: { walletBalance: { increment: outcome.walletAdjustment } },
            });
            await tx.user.updateMany({
              where: { id: parlay.userId, walletBalance: { gt: WALLET_MAX } },
              data: { walletBalance: WALLET_MAX },
            });
          }

          // Upsert (NOT update) so users without a leaderboard row don't
          // throw and roll back the whole resolution.
          if (outcome.leaderboardAdjustment !== 0) {
            await tx.leaderboardScore.upsert({
              where: { userId: parlay.userId },
              create: {
                userId: parlay.userId,
                cumulativeScore: outcome.leaderboardAdjustment,
              },
              update: {
                cumulativeScore: { increment: outcome.leaderboardAdjustment },
              },
            });
          }
        });

        results.resolved++;
        if (outcome.status === "WON") results.won++;
        else if (outcome.status === "LOST") results.lost++;
        else results.refunded++;
      } catch (error) {
        results.errors.push(`Parlay ${parlay.id}: ${String(error)}`);
      }
    }
  } catch (error) {
    results.errors.push(String(error));
  }

  return results;
}
