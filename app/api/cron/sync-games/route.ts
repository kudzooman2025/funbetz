import { NextResponse } from "next/server";
import { syncAllLeagues, type SyncResults } from "@/lib/game-sync";

// Full-season college football sync plus the rolling round window for other
// leagues needs more than the default execution budget.
export const maxDuration = 300;

export async function POST(req: Request) {
  // Verify cron secret. Fail CLOSED when the env var is missing — otherwise
  // "Bearer undefined" would authenticate.
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: SyncResults = { synced: 0, updated: 0, errors: [] };

  try {
    await syncAllLeagues(results);
  } catch (error) {
    results.errors.push(String(error));
  }

  return NextResponse.json(results);
}

// Also allow GET for easy browser testing
export async function GET(req: Request) {
  return POST(req);
}
