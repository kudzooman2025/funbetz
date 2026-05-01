/**
 * GET  /api/derby/picks  → current user's derby pick for 2026
 * POST /api/derby/picks  → place/update picks (deducts wagers from wallet)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DERBY_YEAR, DERBY_LOCK_TIME, DERBY_HORSES,
  calcWinPayout, calcExactaPayout, calcTrifectaPayout,
} from "@/lib/derby-config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pick = await prisma.derbyPick.findUnique({
    where: { userId_year: { userId: session.user.id, year: DERBY_YEAR } },
  });

  return NextResponse.json(pick ?? null);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (new Date() >= DERBY_LOCK_TIME) {
    return NextResponse.json({ error: "Betting is locked — race has started" }, { status: 400 });
  }

  const body = await req.json() as {
    winHorse?: string;    winWager?: number;
    exacta1?: string;     exacta2?: string;     exactaWager?: number;
    trifecta1?: string;   trifecta2?: string;   trifecta3?: string; trifectaWager?: number;
  };

  // Validate horses exist
  const horseNames = DERBY_HORSES.map((h) => h.name);
  const validate = (name?: string) => !name || horseNames.includes(name);
  if (!validate(body.winHorse) || !validate(body.exacta1) || !validate(body.exacta2) ||
      !validate(body.trifecta1) || !validate(body.trifecta2) || !validate(body.trifecta3)) {
    return NextResponse.json({ error: "Invalid horse name" }, { status: 400 });
  }

  // Validate no duplicate horses in exacta/trifecta
  if (body.exacta1 && body.exacta2 && body.exacta1 === body.exacta2) {
    return NextResponse.json({ error: "Exacta must have two different horses" }, { status: 400 });
  }
  const tri = [body.trifecta1, body.trifecta2, body.trifecta3].filter(Boolean);
  if (new Set(tri).size !== tri.length) {
    return NextResponse.json({ error: "Trifecta must have three different horses" }, { status: 400 });
  }

  // Calculate total wager needed
  const getOdds = (name?: string) => DERBY_HORSES.find((h) => h.name === name)?.oddsNum ?? 0;
  let totalWager = 0;
  if (body.winHorse && body.winWager) totalWager += body.winWager;
  if (body.exacta1 && body.exacta2 && body.exactaWager) totalWager += body.exactaWager;
  if (body.trifecta1 && body.trifecta2 && body.trifecta3 && body.trifectaWager) totalWager += body.trifectaWager;

  if (totalWager < 1) {
    return NextResponse.json({ error: "Place at least one bet with a wager" }, { status: 400 });
  }

  // Check if user already has picks (refund old wager)
  const existing = await prisma.derbyPick.findUnique({
    where: { userId_year: { userId: session.user.id, year: DERBY_YEAR } },
  });

  let previousWager = 0;
  if (existing && !existing.settled) {
    if (existing.winWager) previousWager += existing.winWager;
    if (existing.exactaWager) previousWager += existing.exactaWager;
    if (existing.trifectaWager) previousWager += existing.trifectaWager;
  }

  // Check wallet
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletBalance: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const netCost = totalWager - previousWager;
  if (user.walletBalance < netCost) {
    return NextResponse.json({ error: "Insufficient betz balance" }, { status: 400 });
  }

  // Compute potential payouts
  const winPotential = body.winHorse && body.winWager
    ? calcWinPayout(body.winWager, getOdds(body.winHorse)) : null;
  const exactaPotential = body.exacta1 && body.exacta2 && body.exactaWager
    ? calcExactaPayout(body.exactaWager, getOdds(body.exacta1), getOdds(body.exacta2)) : null;
  const trifectaPotential = body.trifecta1 && body.trifecta2 && body.trifecta3 && body.trifectaWager
    ? calcTrifectaPayout(body.trifectaWager, getOdds(body.trifecta1), getOdds(body.trifecta2), getOdds(body.trifecta3)) : null;

  // Upsert picks and deduct wallet atomically
  const [pick] = await prisma.$transaction([
    prisma.derbyPick.upsert({
      where: { userId_year: { userId: session.user.id, year: DERBY_YEAR } },
      create: {
        userId: session.user.id,
        year: DERBY_YEAR,
        winHorse: body.winHorse ?? null,
        winWager: body.winWager ?? null,
        exacta1: body.exacta1 ?? null,
        exacta2: body.exacta2 ?? null,
        exactaWager: body.exactaWager ?? null,
        trifecta1: body.trifecta1 ?? null,
        trifecta2: body.trifecta2 ?? null,
        trifecta3: body.trifecta3 ?? null,
        trifectaWager: body.trifectaWager ?? null,
      },
      update: {
        winHorse: body.winHorse ?? null,
        winWager: body.winWager ?? null,
        exacta1: body.exacta1 ?? null,
        exacta2: body.exacta2 ?? null,
        exactaWager: body.exactaWager ?? null,
        trifecta1: body.trifecta1 ?? null,
        trifecta2: body.trifecta2 ?? null,
        trifecta3: body.trifecta3 ?? null,
        trifectaWager: body.trifectaWager ?? null,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { walletBalance: { decrement: netCost } },
    }),
  ]);

  return NextResponse.json({
    pick,
    potentialPayouts: { win: winPotential, exacta: exactaPotential, trifecta: trifectaPotential },
    walletBalance: user.walletBalance - netCost,
  });
}
