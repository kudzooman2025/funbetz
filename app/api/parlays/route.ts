import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createParlaySchema } from "@/lib/validators";
import { MULTIPLIERS, GAME_BUFFER_HOURS, WALLET_MAX } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parlays = await prisma.parlay.findMany({
    where: { userId: session.user.id },
    include: {
      parlayGames: {
        include: {
          game: {
            select: {
              homeTeam: true,
              awayTeam: true,
              homeTeamBadge: true,
              awayTeamBadge: true,
              scheduledStart: true,
              homeScore: true,
              awayScore: true,
              status: true,
            },
          },
        },
      },
      result: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = parlays.map((p) => ({
    id: p.id,
    betAmount: p.betAmount,
    numGames: p.numGames,
    multiplier: p.multiplier,
    status: p.status,
    potentialPayout: p.betAmount * p.multiplier,
    createdAt: p.createdAt.toISOString(),
    resolvedAt: p.resolvedAt?.toISOString() || null,
    games: p.parlayGames.map((pg) => ({
      id: pg.id,
      gameId: pg.gameId,
      homeTeam: pg.game.homeTeam,
      awayTeam: pg.game.awayTeam,
      homeTeamBadge: pg.game.homeTeamBadge,
      awayTeamBadge: pg.game.awayTeamBadge,
      scheduledStart: pg.game.scheduledStart.toISOString(),
      pickedTeam: pg.pickedTeam,
      result: pg.result,
      homeScore: pg.game.homeScore,
      awayScore: pg.game.awayScore,
      gameStatus: pg.game.status,
    })),
    result: p.result
      ? {
          payoutAmount: p.result.payoutAmount,
          leaderboardAdjustment: p.result.leaderboardAdjustment,
          walletAdjustment: p.result.walletAdjustment,
        }
      : undefined,
  }));

  return NextResponse.json({ parlays: formatted });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createParlaySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { games, betAmount } = parsed.data;

  // Check for duplicate game selections
  const gameIds = games.map((g) => g.gameId);
  if (new Set(gameIds).size !== gameIds.length) {
    return NextResponse.json(
      { error: "Duplicate games in selection" },
      { status: 400 }
    );
  }

  // Get multiplier
  const multiplier = MULTIPLIERS[games.length];
  if (!multiplier) {
    return NextResponse.json(
      { error: "Invalid number of games" },
      { status: 400 }
    );
  }

  // Verify all games exist and are valid
  const bufferTime = new Date(
    Date.now() + GAME_BUFFER_HOURS * 60 * 60 * 1000
  );

  const dbGames = await prisma.game.findMany({
    where: { id: { in: gameIds } },
  });

  if (dbGames.length !== gameIds.length) {
    return NextResponse.json(
      { error: "One or more selected games not found" },
      { status: 400 }
    );
  }

  for (const game of dbGames) {
    if (game.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: `Game "${game.homeTeam} vs ${game.awayTeam}" is no longer available` },
        { status: 400 }
      );
    }
    if (game.scheduledStart <= bufferTime) {
      return NextResponse.json(
        {
          error: `Game "${game.homeTeam} vs ${game.awayTeam}" starts too soon`,
        },
        { status: 400 }
      );
    }
  }

  // Verify picked teams are valid
  for (const pick of games) {
    const game = dbGames.find((g) => g.id === pick.gameId);
    if (!game) continue;
    if (pick.pickedTeam !== game.homeTeam && pick.pickedTeam !== game.awayTeam) {
      return NextResponse.json(
        { error: `Invalid team pick for ${game.homeTeam} vs ${game.awayTeam}` },
        { status: 400 }
      );
    }
  }

  // Use a transaction for wallet deduction + parlay creation
  try {
    const parlay = await prisma.$transaction(async (tx) => {
      // Get current user with wallet balance
      const user = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { walletBalance: true },
      });

      if (user.walletBalance < betAmount) {
        throw new Error("Insufficient wallet balance");
      }

      // Deduct from wallet
      await tx.user.update({
        where: { id: session.user.id },
        data: { walletBalance: { decrement: betAmount } },
      });

      // Create parlay with game picks
      const newParlay = await tx.parlay.create({
        data: {
          userId: session.user.id,
          betAmount,
          numGames: games.length,
          multiplier,
          parlayGames: {
            create: games.map((g) => ({
              gameId: g.gameId,
              pickedTeam: g.pickedTeam,
            })),
          },
        },
      });

      return newParlay;
    });

    return NextResponse.json(
      {
        message: "Parlay placed successfully",
        parlay: {
          id: parlay.id,
          betAmount: parlay.betAmount,
          multiplier: parlay.multiplier,
          potentialPayout: parlay.betAmount * parlay.multiplier,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to place bet";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
