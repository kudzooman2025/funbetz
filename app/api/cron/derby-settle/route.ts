/**
 * GET /api/cron/derby-settle
 *
 * Called by cron job after the race completes.
 * If results have already been entered manually, this settles all unsettled picks.
 * Protected by CRON_SECRET env var.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DERBY_YEAR,
  calcWinPayout, calcExactaPayout, calcTrifectaPayout,
  DERBY_HORSES,
} from "@/lib/derby-config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.derbyResult.findUnique({ where: { year: DERBY_YEAR } });

  if (!result?.first || !result?.second || !result?.third) {
    return NextResponse.json({ message: "Results not yet entered — nothing to settle" });
  }

  const { first, second, third } = result;
  const getOdds = (name: string) => DERBY_HORSES.find((h) => h.name === name)?.oddsNum ?? 0;

  const picks = await prisma.derbyPick.findMany({
    where: { year: DERBY_YEAR, settled: false },
  });

  let settled = 0;
  let totalPaidOut = 0;

  for (const pick of picks) {
    let winPayout = 0;
    let exactaPayout = 0;
    let trifectaPayout = 0;
    const winResult = pick.winHorse ? (pick.winHorse === first ? "won" : "lost") : null;
    const exactaResult = (pick.exacta1 && pick.exacta2)
      ? (pick.exacta1 === first && pick.exacta2 === second ? "won" : "lost") : null;
    const trifectaResult = (pick.trifecta1 && pick.trifecta2 && pick.trifecta3)
      ? (pick.trifecta1 === first && pick.trifecta2 === second && pick.trifecta3 === third ? "won" : "lost") : null;

    if (winResult === "won" && pick.winWager) winPayout = calcWinPayout(pick.winWager, getOdds(first));
    if (exactaResult === "won" && pick.exactaWager) exactaPayout = calcExactaPayout(pick.exactaWager, getOdds(first), getOdds(second));
    if (trifectaResult === "won" && pick.trifectaWager) trifectaPayout = calcTrifectaPayout(pick.trifectaWager, getOdds(first), getOdds(second), getOdds(third));

    const totalPayout = winPayout + exactaPayout + trifectaPayout;
    totalPaidOut += totalPayout;

    await prisma.$transaction([
      prisma.derbyPick.update({
        where: { id: pick.id },
        data: {
          settled: true,
          winResult,
          winPayout: winPayout > 0 ? winPayout : null,
          exactaResult,
          exactaPayout: exactaPayout > 0 ? exactaPayout : null,
          trifectaResult,
          trifectaPayout: trifectaPayout > 0 ? trifectaPayout : null,
        },
      }),
      ...(totalPayout > 0 ? [
        prisma.user.update({
          where: { id: pick.userId },
          data: { walletBalance: { increment: totalPayout } },
        }),
      ] : []),
    ]);

    settled++;
  }

  return NextResponse.json({ settled, totalPaidOut, first, second, third });
}
