import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";
import {
  syncFullSeason,
  syncCfbSeason,
  type SyncResults,
} from "@/lib/game-sync";

// Walking a full season is slower than the nightly rolling sync.
export const maxDuration = 300;

/**
 * Load an entire season's schedule for one league.
 *
 * Usage:
 *   /api/cron/backfill-season?league=NCAAF   (admin session, or cron bearer)
 *
 * Games land in the DB immediately but only become bettable once they fall
 * inside the weekly betting window — see lib/utils.getBettingWindow.
 */
async function handle(req: Request) {
  // Accept either an admin session (the Admin page button) or the cron secret
  // (curl / scheduled job).
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const hasCronAuth = Boolean(secret) && authHeader === `Bearer ${secret}`;

  if (!hasCronAuth) {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const leagueParam = searchParams.get("league")?.toUpperCase();

  if (!leagueParam || !LEAGUE_KEYS.includes(leagueParam as LeagueKey)) {
    return NextResponse.json(
      { error: `league must be one of: ${LEAGUE_KEYS.join(", ")}` },
      { status: 400 }
    );
  }

  const league = leagueParam as LeagueKey;
  const results: SyncResults = { synced: 0, updated: 0, errors: [] };

  try {
    if (league === "NCAAF") {
      // College football comes from a dedicated D1/FBS provider in one pass.
      const info = await syncCfbSeason(results);
      return NextResponse.json({ league, ...info, ...results });
    }

    const info = await syncFullSeason(league, results);
    return NextResponse.json({ league, ...info, ...results });
  } catch (error) {
    results.errors.push(String(error));
    return NextResponse.json({ league, ...results }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
