import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tournaments/[id]/parlays
 *
 * League-mates' parlay cards, for the league's date window only.
 *
 * Two rules protect people:
 *  1. Sharing is OPT-IN. A member's cards only appear if they turned on
 *     shareParlays. Your own cards are always visible to you.
 *  2. Picks on a still-open card stay hidden until that game locks, so
 *     nobody can copy a league-mate's board before kickoff. The card's
 *     shape (leg count, stake, potential payout) is always visible, which
 *     is the fun part, without giving the picks away.
 */
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
    select: {
      id: true,
      startDate: true,
      endDate: true,
      members: { select: { userId: true } },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "League not found." }, { status: 404 });
  }
  if (!tournament.members.some((m) => m.userId === userId)) {
    return NextResponse.json(
      { error: "You are not a member of this league." },
      { status: 403 }
    );
  }

  const memberIds = tournament.members.map((m) => m.userId);

  const parlays = await prisma.parlay.findMany({
    where: {
      userId: { in: memberIds },
      // Only cards placed during the league's run count toward it.
      createdAt: { gte: tournament.startDate, lte: tournament.endDate },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      userId: true,
      betAmount: true,
      numGames: true,
      multiplier: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      user: { select: { username: true, shareParlays: true } },
      result: { select: { payoutAmount: true, leaderboardAdjustment: true } },
      parlayGames: {
        select: {
          id: true,
          pickedTeam: true,
          result: true,
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
    },
  });

  const now = new Date();

  const cards = parlays
    // Hide other people's cards unless they opted in.
    .filter((p) => p.userId === userId || p.user.shareParlays)
    .map((p) => {
      const isOwn = p.userId === userId;
      // A leg's pick is revealed once its game has started (or the card is
      // settled). Until then only the matchup shows.
      const legs = p.parlayGames.map((pg) => {
        const locked = pg.game.scheduledStart <= now;
        const revealed = isOwn || locked || p.status !== "PENDING";
        return {
          id: pg.id,
          homeTeam: pg.game.homeTeam,
          awayTeam: pg.game.awayTeam,
          homeTeamBadge: pg.game.homeTeamBadge,
          awayTeamBadge: pg.game.awayTeamBadge,
          scheduledStart: pg.game.scheduledStart.toISOString(),
          homeScore: pg.game.homeScore,
          awayScore: pg.game.awayScore,
          gameStatus: pg.game.status,
          pickedTeam: revealed ? pg.pickedTeam : null,
          result: revealed ? pg.result : null,
          hidden: !revealed,
        };
      });

      return {
        id: p.id,
        username: p.user.username,
        isOwn,
        betAmount: p.betAmount,
        numGames: p.numGames,
        multiplier: p.multiplier,
        potentialPayout: Math.round(p.betAmount * p.multiplier),
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        resolvedAt: p.resolvedAt?.toISOString() ?? null,
        payout: p.result?.payoutAmount ?? null,
        netChange: p.result?.leaderboardAdjustment ?? null,
        legs,
        anyHidden: legs.some((l) => l.hidden),
      };
    });

  // Who is sharing, so the UI can nudge people who aren't.
  const sharingCount = await prisma.user.count({
    where: { id: { in: memberIds }, shareParlays: true },
  });

  return NextResponse.json({
    cards,
    memberCount: memberIds.length,
    sharingCount,
    youAreSharing:
      (await prisma.user.findUnique({
        where: { id: userId },
        select: { shareParlays: true },
      }))?.shareParlays ?? false,
  });
}
