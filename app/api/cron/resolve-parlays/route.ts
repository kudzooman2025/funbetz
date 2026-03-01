import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WALLET_MAX } from "@/lib/constants";

const RESOLVE_DELAY_HOURS = 4;

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { resolved: 0, won: 0, lost: 0, errors: [] as string[] };

  try {
    // Find all PENDING parlays
    const pendingParlays = await prisma.parlay.findMany({
      where: { status: "PENDING" },
      include: {
        parlayGames: {
          include: {
            game: true,
          },
        },
      },
    });

    for (const parlay of pendingParlays) {
      try {
        // Check if all games in this parlay are completed
        const allCompleted = parlay.parlayGames.every(
          (pg) => pg.game.status === "COMPLETED"
        );
        if (!allCompleted) continue;

        // Check if the delay has passed since the last game completed
        const latestCompletedAt = parlay.parlayGames.reduce(
          (latest, pg) => {
            const completedAt = pg.game.completedAt;
            if (!completedAt) return latest;
            return completedAt > latest ? completedAt : latest;
          },
          new Date(0)
        );

        const delayMs = RESOLVE_DELAY_HOURS * 60 * 60 * 1000;
        if (Date.now() - latestCompletedAt.getTime() < delayMs) continue;

        // Determine results for each pick
        let allWon = true;
        const pickResults: { id: string; won: boolean }[] = [];

        for (const pg of parlay.parlayGames) {
          const { homeScore, awayScore } = pg.game;
          if (homeScore === null || awayScore === null) {
            // Scores not available yet, skip this parlay
            allWon = false;
            break;
          }

          let winner: string | null = null;
          if (homeScore > awayScore) {
            winner = pg.game.homeTeam;
          } else if (awayScore > homeScore) {
            winner = pg.game.awayTeam;
          }
          // Draw = no winner, pick is a loss

          const won = winner === pg.pickedTeam;
          pickResults.push({ id: pg.id, won });

          if (!won) allWon = false;
        }

        // If we couldn't determine all results, skip
        if (pickResults.length !== parlay.parlayGames.length) continue;

        // Calculate financial impact
        const parlayStatus = allWon ? "WON" : "LOST";
        let payoutAmount = 0;
        let leaderboardAdjustment = 0;
        let walletAdjustment = 0;

        if (allWon) {
          payoutAmount = Math.round(parlay.betAmount * parlay.multiplier);
          leaderboardAdjustment = payoutAmount - parlay.betAmount; // net profit
          walletAdjustment = payoutAmount;
        } else {
          payoutAmount = 0;
          leaderboardAdjustment = -parlay.betAmount; // net loss
          walletAdjustment = 0;
        }

        // Apply everything in a transaction
        await prisma.$transaction(async (tx) => {
          // Re-check parlay is still PENDING (prevent double resolution)
          const current = await tx.parlay.findUnique({
            where: { id: parlay.id },
            select: { status: true },
          });
          if (current?.status !== "PENDING") return;

          // Update parlay status
          await tx.parlay.update({
            where: { id: parlay.id },
            data: {
              status: parlayStatus as "WON" | "LOST",
              resolvedAt: new Date(),
            },
          });

          // Update individual pick results
          for (const pr of pickResults) {
            await tx.parlayGame.update({
              where: { id: pr.id },
              data: { result: pr.won ? "WON" : "LOST" },
            });
          }

          // Create ParlayResult record
          await tx.parlayResult.create({
            data: {
              parlayId: parlay.id,
              payoutAmount,
              leaderboardAdjustment,
              walletAdjustment,
            },
          });

          // Update wallet (if won)
          if (walletAdjustment > 0) {
            const user = await tx.user.findUniqueOrThrow({
              where: { id: parlay.userId },
              select: { walletBalance: true },
            });

            const newBalance = Math.min(
              user.walletBalance + walletAdjustment,
              WALLET_MAX
            );

            await tx.user.update({
              where: { id: parlay.userId },
              data: { walletBalance: newBalance },
            });
          }

          // Update leaderboard score
          await tx.leaderboardScore.update({
            where: { userId: parlay.userId },
            data: {
              cumulativeScore: { increment: leaderboardAdjustment },
            },
          });
        });

        results.resolved++;
        if (allWon) results.won++;
        else results.lost++;
      } catch (error) {
        results.errors.push(`Parlay ${parlay.id}: ${String(error)}`);
      }
    }
  } catch (error) {
    results.errors.push(String(error));
  }

  return NextResponse.json(results);
}

export async function GET(req: Request) {
  return POST(req);
}
