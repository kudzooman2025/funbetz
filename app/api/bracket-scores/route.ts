import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bracket-scores?challengeId=va26-u13-ad
 * Public endpoint — returns group_score results for the schedule page.
 * No auth required so unauthenticated visitors can see scores.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId") ?? "va26-u13-ad";

  const results = await prisma.bracketResult.findMany({
    where: { challengeId, round: "group_score" },
    select: { key: true, winner: true },
  });

  return NextResponse.json(results);
}
