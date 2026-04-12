/**
 * POST /api/admin/recalculate?challengeId=va26-u13-ad
 *
 * Recalculates the score for every bracket entry using the current
 * BracketResult rows in the DB. Updates BracketEntry.score in place.
 *
 * Call this after saving new results (scrape or manual).
 * Requires isAdmin === true.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStoredResults, calculateScore } from "@/lib/bracket-scoring";
import type { BracketPicks } from "@/lib/bracket-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return session;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId") ?? "va26-u13-ad";

  // Load all stored results for this challenge
  const resultRows = await prisma.bracketResult.findMany({
    where: { challengeId },
  });
  const storedResults = buildStoredResults(resultRows);

  // Load every bracket entry
  const entries = await prisma.bracketEntry.findMany({
    where: { challengeId },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    try {
      const picks = entry.picks as unknown as BracketPicks;
      const score = calculateScore(picks, storedResults);

      if (score !== entry.score) {
        await prisma.bracketEntry.update({
          where: { id: entry.id },
          data: { score },
        });
        updated++;
      }
    } catch (err) {
      errors.push(`Entry ${entry.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    total: entries.length,
    updated,
    errors,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
