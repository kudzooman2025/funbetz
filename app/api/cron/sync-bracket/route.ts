/**
 * POST /api/cron/sync-bracket
 *
 * Vercel cron job that:
 *   1. Scrapes modular11.com for playoff match results.
 *   2. Saves any newly completed results to the DB (skips manual overrides).
 *   3. Recalculates every bracket entry score.
 *
 * Secured via CRON_SECRET Bearer token (set in Vercel env vars).
 *
 * Schedule (vercel.json): hourly on tournament days (May 3–4 2026).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeAllPlayoffResults } from "@/lib/modular11";
import { buildStoredResults, calculateScore } from "@/lib/bracket-scoring";
import type { BracketPicks } from "@/lib/bracket-config";

const CHALLENGE_ID = "va26-u13-ad";

export async function POST(req: Request) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = {
    scrape: { saved: [] as string[], skipped: [] as string[], errors: [] as string[] },
    scoring: { total: 0, updated: 0, errors: [] as string[] },
  };

  // ── Step 1: Scrape ──────────────────────────────────────────────────────────
  try {
    const scraped = await scrapeAllPlayoffResults();
    summary.scrape.errors.push(...scraped.errors);

    async function maybeSave(round: string, key: string, winner: string) {
      const existing = await prisma.bracketResult.findUnique({
        where: { challengeId_round_key: { challengeId: CHALLENGE_ID, round, key } },
      });
      if (existing?.source === "manual") {
        summary.scrape.skipped.push(`${round}/${key} (manual preserved)`);
        return;
      }
      await prisma.bracketResult.upsert({
        where: { challengeId_round_key: { challengeId: CHALLENGE_ID, round, key } },
        create: { challengeId: CHALLENGE_ID, round, key, winner, source: "scraper" },
        update: { winner, source: "scraper" },
      });
      summary.scrape.saved.push(`${round}/${key} → ${winner}`);
    }

    for (const [key, match] of Object.entries(scraped.qf)) {
      if (match.winner) await maybeSave("qf", key, match.winner);
    }
    for (const [key, match] of Object.entries(scraped.sf)) {
      if (match.winner) await maybeSave("sf", key, match.winner);
    }
    if (scraped.final?.winner) {
      await maybeSave("final", "1", scraped.final.winner);
    }
  } catch (err) {
    summary.scrape.errors.push(`Scrape failed: ${String(err)}`);
  }

  // ── Step 2: Recalculate scores ──────────────────────────────────────────────
  try {
    const resultRows = await prisma.bracketResult.findMany({
      where: { challengeId: CHALLENGE_ID },
    });
    const storedResults = buildStoredResults(resultRows);

    const entries = await prisma.bracketEntry.findMany({
      where: { challengeId: CHALLENGE_ID },
    });

    summary.scoring.total = entries.length;

    for (const entry of entries) {
      try {
        const picks = entry.picks as unknown as BracketPicks;
        const score = calculateScore(picks, storedResults);
        if (score !== entry.score) {
          await prisma.bracketEntry.update({
            where: { id: entry.id },
            data: { score },
          });
          summary.scoring.updated++;
        }
      } catch (err) {
        summary.scoring.errors.push(`Entry ${entry.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    summary.scoring.errors.push(`Scoring failed: ${String(err)}`);
  }

  return NextResponse.json(summary);
}

// Allow GET for easy testing (Vercel also sends GET for cron jobs)
export async function GET(req: Request) {
  return POST(req);
}
