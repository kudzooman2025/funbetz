import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBettingWindow } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport")?.toUpperCase();

  if (sport && sport !== "EPL" && sport !== "NFL") {
    return NextResponse.json(
      { error: "Invalid sport. Must be EPL or NFL" },
      { status: 400 }
    );
  }

  const { start, end } = getBettingWindow();

  const games = await prisma.game.findMany({
    where: {
      ...(sport ? { sport: sport as "EPL" | "NFL" } : {}),
      scheduledStart: {
        gte: start,
        lte: end,
      },
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
    },
  });

  return NextResponse.json({ games });
}
