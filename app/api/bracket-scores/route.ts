import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bracket-scores?challengeId=va26-u13-ad
 * Returns group_score results for the schedule page (any logged-in user).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId") ?? "va26-u13-ad";

  const results = await prisma.bracketResult.findMany({
    where: { challengeId, round: "group_score" },
    select: { key: true, winner: true },
  });

  return NextResponse.json(results);
}
