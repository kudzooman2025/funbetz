/**
 * POST /api/admin/scrape?challengeId=va26-u13-ad
 *
 * Triggers a live scrape of modular11.com for playoff results.
 * Saves any completed match results to the DB (source = "scraper").
 * Existing MANUAL entries are NOT overwritten.
 * Returns a summary of what was found and any errors.
 *
 * Requires isAdmin === true.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeAllPlayoffResults } from "@/lib/modular11";

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

  const saved: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  try {
    const scraped = await scrapeAllPlayoffResults();
    errors.push(...scraped.errors);

    // Helper: save one result, skipping if a manual entry already exists
    async function maybeSave(round: string, key: string, winner: string) {
      const existing = await prisma.bracketResult.findUnique({
        where: { challengeId_round_key: { challengeId, round, key } },
      });
      if (existing?.source === "manual") {
        skipped.push(`${round}/${key} (manual entry preserved)`);
        return;
      }
      await prisma.bracketResult.upsert({
        where: { challengeId_round_key: { challengeId, round, key } },
        create: { challengeId, round, key, winner, source: "scraper" },
        update: { winner, source: "scraper" },
      });
      saved.push(`${round}/${key} → ${winner}`);
    }

    // QF results
    for (const [key, match] of Object.entries(scraped.qf)) {
      if (match.winner) {
        await maybeSave("qf", key, match.winner);
      }
    }

    // SF results
    for (const [key, match] of Object.entries(scraped.sf)) {
      if (match.winner) {
        await maybeSave("sf", key, match.winner);
      }
    }

    // Final result
    if (scraped.final?.winner) {
      await maybeSave("final", "1", scraped.final.winner);
    }
  } catch (err) {
    errors.push(String(err));
  }

  return NextResponse.json({ saved, skipped, errors });
}

// Allow GET for easy browser testing
export async function GET(req: Request) {
  return POST(req);
}
