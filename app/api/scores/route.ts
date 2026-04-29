/**
 * GET /api/scores?challengeId=va26-u13-ad
 *
 * Public (no auth) — returns group_score results so the schedule page
 * can display live scores to all visitors.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId") ?? "va26-u13-ad";

  const results = await prisma.bracketResult.findMany({
    where: { challengeId, round: "group_score" },
    select: { key: true, winner: true, updatedAt: true },
  });

  // Return as a map: { [gameId]: "home-away" }
  const scoreMap: Record<string, string> = {};
  for (const r of results) {
    scoreMap[r.key] = r.winner;
  }

  return NextResponse.json(scoreMap);
}
