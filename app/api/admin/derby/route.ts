/**
 * POST /api/admin/derby  → set race results and settle all picks
 * GET  /api/admin/derby  → get all derby picks summary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DERBY_YEAR,
  calcWinPayout, calcExactaPayout, calcTrifectaPayout,
  DERBY_HORSES,
} from "@/lib/derby-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const picks = await prisma.derbyPick.findMany({
    where: { year: DERBY_YEAR },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "asc" },
  });

  const result = await prisma.derbyResult.findUnique({ where: { year: DERBY_YEAR } });

  return NextResponse.json({ picks, result, total: picks.length });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { first: string; second: string; third: string };
  const { first, second, third } = body;

  if (!first || !second || !third) {
    return NextResponse.json({ error: "first, second, and third are required" }, { status: 400 });
  }

  const horseNames = DERBY_HORSES.map((h) => h.name);
  if (!horseNames.includes(first) || !horseNames.includes(second) || !horseNames.includes(third)) {
    return NextResponse.json({ error: "Invalid horse name(s)" }, { status: 400 });
  }

  const getOdds = (name: string) => DERBY_HORSES.find((h) => h.name === name)?.oddsNum ?? 0;

  // Upsert result
  await prisma.derbyResult.upsert({
    where: { year: DERBY_YEAR },
    create: { year: DERBY_YEAR, first, second, third, settled: true, settledAt: new Date() },
    update: { first, second, third, settled: true, settledAt: new Date() },
  });

  // Settle all picks
  const picks = await prisma.derbyPick.findMany({
    where: { year: DERBY_YEAR, settled: false },
  });

  let settled = 0;
  let totalPaidOut = 0;

  for (const pick of picks) {
    let winPayout = 0;
    let exactaPayout = 0;
    let trifectaPayout = 0;
    let winResult = pick.winHorse ? "lost" : null;
    let exactaResult = (pick.exacta1 && pick.exacta2) ? "lost" : null;
    let trifectaResult = (pick.trifecta1 && pick.trifecta2 && pick.trifecta3) ? "lost" : null;

    // Win
    if (pick.winHorse && pick.winWager && pick.winHorse === first) {
      winPayout = calcWinPayout(pick.winWager, getOdds(first));
      winResult = "won";
    }

    // Exacta
    if (pick.exacta1 && pick.exacta2 && pick.exactaWager &&
        pick.exacta1 === first && pick.exacta2 === second) {
      exactaPayout = calcExactaPayout(pick.exactaWager, getOdds(first), getOdds(second));
      exactaResult = "won";
    }

    // Trifecta
    if (pick.trifecta1 && pick.trifecta2 && pick.trifecta3 && pick.trifectaWager &&
        pick.trifecta1 === first && pick.trifecta2 === second && pick.trifecta3 === third) {
      trifectaPayout = calcTrifectaPayout(pick.trifectaWager, getOdds(first), getOdds(second), getOdds(third));
      trifectaResult = "won";
    }

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
