import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBettingWindow } from "@/lib/utils";
import { LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";

/** Safety cap so a full multi-league season can't return an unbounded payload. */
const MAX_GAMES = 1500;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sportParam = searchParams.get("sport")?.toUpperCase();

  // Support comma-separated sports: ?sport=NFL,NBA,MLB
  let sportFilter: LeagueKey[] | undefined;
  if (sportParam) {
    const requested = sportParam.split(",").map((s) => s.trim());
    const invalid = requested.find((s) => !LEAGUE_KEYS.includes(s as LeagueKey));
    if (invalid) {
      return NextResponse.json(
        { error: `Invalid sport "${invalid}". Must be one of: ${LEAGUE_KEYS.join(", ")}` },
        { status: 400 }
      );
    }
    sportFilter = requested as LeagueKey[];
  }

  // The FULL upcoming schedule is returned so users can see the whole season.
  // Betting is gated separately: only games inside the current betting window
  // are marked bettable, and POST /api/parlays re-checks the window
  // server-side, so a locked game can never be wagered on.
  const { start, end } = getBettingWindow();

  const games = await prisma.game.findMany({
    where: {
      ...(sportFilter ? { sport: { in: sportFilter } } : {}),
      status: "SCHEDULED",
      scheduledStart: { gte: new Date() },
    },
    orderBy: { scheduledStart: "asc" },
    take: MAX_GAMES,
    select: {
      id: true,
      sport: true,
      league: true,
      homeTeam: true,
      awayTeam: true,
      homeTeamBadge: true,
      awayTeamBadge: true,
      scheduledStart: true,
      status: true,
      round: true,
    },
  });

  const withBettable = games.map((game) => ({
    ...game,
    bettable: game.scheduledStart >= start && game.scheduledStart <= end,
  }));

  return NextResponse.json({
    games: withBettable,
    window: { start: start.toISOString(), end: end.toISOString() },
  });
}
