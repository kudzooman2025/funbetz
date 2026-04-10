import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBettingWindow } from "@/lib/utils";
import { LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";

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

  const previewMode = searchParams.get("preview") === "true";
  const { start, end } = getBettingWindow();

  const games = await prisma.game.findMany({
    where: {
      ...(sportFilter ? { sport: { in: sportFilter } } : {}),
      ...(previewMode
        ? {}
        : {
            scheduledStart: { gte: start, lte: end },
          }),
      status: "SCHEDULED",
    },
    orderBy: { scheduledStart: "asc" },
    select: {
      id: true,
      sport: true,
      homeTeam: true,
      awayTeam: true,
      homeTeamBadge: true,
      awayTeamBadge: true,
      scheduledStart: true,
      status: true,
      round: true,
    },
  });

  return NextResponse.json({ games });
}
