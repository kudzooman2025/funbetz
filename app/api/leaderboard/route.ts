import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const scores = await prisma.leaderboardScore.findMany({
    include: {
      user: {
        select: { username: true },
      },
    },
    orderBy: { cumulativeScore: "desc" },
    take: 100,
  });

  const leaderboard = scores.map((entry, index) => ({
    rank: index + 1,
    username: entry.user.username,
    score: entry.cumulativeScore,
  }));

  return NextResponse.json({ leaderboard });
}
