import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WALLET_MAX } from "@/lib/constants";

const RESOLVE_DELAY_HOURS = 1;

export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { resolved: 0, won: 0, lost: 0, errors: [] as string[] };

  try {
    const pendingParlays = await prisma.parlay.findMany({
      where: { status: "PENDING" },
      include: { parlayGames: { include: { game: true } } },
    });

    for (const parlay of pendingParlays) {
      try {
        const allCompleted = parlay.parlayGames.every(
          (pg) => pg.game.status === "COMPLETED"
        );
        if (!allCompleted) continue;

        const latestCompletedAt = parlay.parlayGames.reduce((latest, pg) => {
          const c = pg.game.completedAt;
          if (!c) return latest;
          return c > latest ? c : latest;
        }, new Date(0));

        const delayMs = RESOLVE_DELAY_HOURS * 60 * 60 * 1000;
        if (Date.now() - latestCompletedAt.getTime() < delayMs) continue;

        let allWon = true;
        const pickResults: { id: string; won: boolean }[] = [];

        for (const pg of parlay.parlayGames) {
          const { homeScore, awayScore } = pg.game;
          if (homeScore === null || awayScore === null) { allWon = false; break; }

          let winner: string | null = null;
          if (homeScore > awayScore) winner = pg.game.homeTeam;
          else if (awayScore > homeScore) winner = pg.game.awayTeam;

          const won = winner === pg.pickedTeam;
          pickResults.push({ id: pg.id, won });
          if (!won) allWon = false;
        }

        if (pickResults.length !== parlay.parlayGames.length) continue;

        const parlayStatus = allWon ? "WON" : "LOST";
        const payoutAmount = allWon ? Math.round(parlay.betAmount * parlay.multiplier) : 0;
        const leaderboardAdjustment = allWon ? payoutAmount - parlay.betAmount : -parlay.betAmount;
        const walletAdjustment = allWon ? payoutAmount : 0;

        await prisma.$transaction(async (tx) => {
          const current = await tx.parlay.findUnique({
            where: { id: parlay.id }, select: { status: true },
          });
          if (current?.status !== "PENDING") return;

          await tx.parlay.update({
            where: { id: parlay.id },
            data: { status: parlayStatus as "WON" | "LOST", resolvedAt: new Date() },
          });

          for (const pr of pickResults) {
            await tx.parlayGame.update({
              where: { id: pr.id },
              data: { result: pr.won ? "WON" : "LOST" },
            });
          }

          await tx.parlayResult.create({
            data: { parlayId: parlay.id, payoutAmount, leaderboardAdjustment, walletAdjustment },
          });

          if (walletAdjustment > 0) {
            const user = await tx.user.findUniqueOrThrow({
              where: { id: parlay.userId }, select: { walletBalance: true },
            });
            await tx.user.update({
              where: { id: parlay.userId },
              data: { walletBalance: Math.min(user.walletBalance + walletAdjustment, WALLET_MAX) },
            });
          }

          await tx.leaderboardScore.update({
            where: { userId: parlay.userId },
            data: { cumulativeScore: { increment: leaderboardAdjustment } },
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
