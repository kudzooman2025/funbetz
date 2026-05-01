/**
 * POST /api/cron/derby-enter-results
 *
 * Accepts { first, second, third } in the request body.
 * Protected by Bearer CRON_SECRET — no admin session required.
 * Sets race results AND settles all unsettled picks in one shot.
 *
 * Used by the scheduled cron task after auto-scraping results.
 * Manual fallback: admin can POST to /api/admin/derby instead.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DERBY_YEAR,
  calcWinPayout,
  calcExactaPayout,
  calcTrifectaPayout,
  DERBY_HORSES,
} from "@/lib/derby-config";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { first?: string; second?: string; third?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { first, second, third } = body;

  if (!first || !second || !third) {
    return NextResponse.json(
      { error: "first, second, and third are required" },
      { status: 400 }
    );
  }

  const horseNames = DERBY_HORSES.map((h) => h.name);
  if (
    !horseNames.includes(first) ||
    !horseNames.includes(second) ||
    !horseNames.includes(third)
  ) {
    return NextResponse.json(
      {
        error: "Invalid horse name(s)",
        validNames: horseNames,
        received: { first, second, third },
      },
      { status: 400 }
    );
  }

  const getOdds = (name: string) =>
    DERBY_HORSES.find((h) => h.name === name)?.oddsNum ?? 0;

  // Upsert result record
  await prisma.derbyResult.upsert({
    where: { year: DERBY_YEAR },
    create: {
      year: DERBY_YEAR,
      first,
      second,
      third,
      settled: true,
      settledAt: new Date(),
    },
    update: {
      first,
      second,
      third,
      settled: true,
      settledAt: new Date(),
    },
  });

  // Settle all unsettled picks
  const picks = await prisma.derbyPick.findMany({
    where: { year: DERBY_YEAR, settled: false },
  });

  let settled = 0;
  let totalPaidOut = 0;

  for (const pick of picks) {
    let winPayout = 0;
    let exactaPayout = 0;
    let trifectaPayout = 0;
    let winResult: string | null = pick.winHorse ? "lost" : null;
    let exactaResult: string | null =
      pick.exacta1 && pick.exacta2 ? "lost" : null;
    let trifectaResult: string | null =
      pick.trifecta1 && pick.trifecta2 && pick.trifecta3 ? "lost" : null;

    if (pick.winHorse === first && pick.winWager) {
      winPayout = calcWinPayout(pick.winWager, getOdds(first));
      winResult = "won";
    }

    if (
      pick.exacta1 === first &&
      pick.exacta2 === second &&
      pick.exactaWager
    ) {
      exactaPayout = calcExactaPayout(
        pick.exactaWager,
        getOdds(first),
        getOdds(second)
      );
      exactaResult = "won";
    }

    if (
      pick.trifecta1 === first &&
      pick.trifecta2 === second &&
      pick.trifecta3 === third &&
      pick.trifectaWager
    ) {
      trifectaPayout = calcTrifectaPayout(
        pick.trifectaWager,
        getOdds(first),
        getOdds(second),
        getOdds(third)
      );
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
      ...(totalPayout > 0
        ? [
            prisma.user.update({
              where: { id: pick.userId },
              data: { walletBalance: { increment: totalPayout } },
            }),
          ]
        : []),
    ]);

    settled++;
  }

  return NextResponse.json({
    success: true,
    first,
    second,
    third,
    settled,
    totalPaidOut,
  });
}
