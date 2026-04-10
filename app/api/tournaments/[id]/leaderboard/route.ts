import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      sports: true,
      members: {
        include: {
          user: { select: { id: true, username: true } },
        },
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const isMember = tournament.members.some((m) => m.userId === userId);
  if (!isMember) {
    return NextResponse.json({ error: "You are not a member of this tournament." }, { status: 403 });
  }

  const memberUserIds = tournament.members.map((m) => m.userId);
  const allowedSports = tournament.sports.map((s) => s.sport);

  // Compute leaderboard: sum of leaderboardAdjustment from ParlayResults
  // for parlays created within tournament date range by members, for allowed sports
  const results = await prisma.parlayResult.findMany({
    where: {
      parlay: {
        userId: { in: memberUserIds },
        createdAt: {
          gte: tournament.startDate,
          lte: tournament.endDate,
        },
        parlayGames: {
          some: {
            game: {
              sport: { in: allowedSports },
            },
          },
        },
      },
    },
    include: {
      parlay: {
        select: {
          userId: true,
          parlayGames: {
            include: { game: { select: { sport: true } } },
          },
        },
      },
    },
  });

  // Aggregate scores per user
  const scoreMap: Record<string, number> = {};
  for (const r of results) {
    const uid = r.parlay.userId;
    // Only count parlays that contain at least one game with an allowed sport
    const hasAllowedSport = r.parlay.parlayGames.some((pg) =>
      allowedSports.includes(pg.game.sport)
    );
    if (!hasAllowedSport) continue;
    scoreMap[uid] = (scoreMap[uid] ?? 0) + r.leaderboardAdjustment;
  }

  // Build ranked leaderboard
  const leaderboard = tournament.members
    .map((m) => ({
      userId: m.userId,
      username: m.user.username,
      score: scoreMap[m.userId] ?? 0,
      isCurrentUser: m.userId === userId,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ rank: i + 1, ...entry }));

  return NextResponse.json({ leaderboard });
}
