import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LEAGUES, LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";
import {
  fetchRoundEvents,
  fetchEventById,
  parseEventToGameData,
  leagueKeyFromEvent,
  delay,
} from "@/lib/sports-api";

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { synced: 0, updated: 0, errors: [] as string[] };

  try {
    // Sync all leagues with rate limiting between each
    for (const key of LEAGUE_KEYS) {
      await syncLeagueRounds(key, results);
      await delay(2500);
    }

    // Also update games that are in active parlays
    await updateActiveParlayGames(results);
  } catch (error) {
    results.errors.push(String(error));
  }

  return NextResponse.json(results);
}

async function syncLeagueRounds(
  league: LeagueKey,
  results: { synced: number; updated: number; errors: string[] }
) {
  const config = LEAGUES[league];

  // Find the current round from DB
  const upcomingGame = await prisma.game.findFirst({
    where: { sport: league, status: "SCHEDULED", scheduledStart: { gte: new Date() } },
    orderBy: { round: "asc" },
    select: { round: true },
  });

  let currentRound: number;
  if (upcomingGame?.round) {
    currentRound = upcomingGame.round;
  } else {
    // Data-driven round estimation from calendar
    const now = new Date();
    const seasonStart = new Date(config.seasonStart);
    const weeksSinceStart = Math.floor(
      (now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    currentRound = Math.max(
      1,
      Math.min(config.totalRounds, weeksSinceStart * config.roundsPerWeek + 1)
    );
  }

  // High-round sports sync fewer rounds ahead to respect rate limits
  const roundsAhead = config.totalRounds > 40 ? 1 : 3;
  const startRound = Math.max(1, currentRound - 1);
  const endRound = Math.min(config.totalRounds, currentRound + roundsAhead);

  for (let r = startRound; r <= endRound; r++) {
    try {
      const events = await fetchRoundEvents(league, r);

      for (const event of events) {
        const gameData = parseEventToGameData(event, league);

        await prisma.game.upsert({
          where: { externalId: gameData.externalId },
          update: {
            homeScore: gameData.homeScore,
            awayScore: gameData.awayScore,
            status: gameData.status,
            completedAt: gameData.completedAt,
            homeTeamBadge: gameData.homeTeamBadge,
            awayTeamBadge: gameData.awayTeamBadge,
          },
          create: gameData,
        });

        results.synced++;
      }

      await delay(2100); // Stay under 30 req/min
    } catch (error) {
      results.errors.push(`${league} round ${r}: ${String(error)}`);
    }
  }
}

async function updateActiveParlayGames(
  results: { synced: number; updated: number; errors: string[] }
) {
  // Find games that are in active parlays but not yet completed
  const pendingGames = await prisma.game.findMany({
    where: {
      status: { not: "COMPLETED" },
      parlayGames: {
        some: {
          parlay: { status: "PENDING" },
        },
      },
    },
    select: { externalId: true, id: true, sport: true },
  });

  for (const game of pendingGames) {
    try {
      const event = await fetchEventById(game.externalId);
      if (!event) continue;

      // Use league ID lookup, fall back to DB sport
      const sport = leagueKeyFromEvent(event) ?? (game.sport as LeagueKey);
      const gameData = parseEventToGameData(event, sport);

      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: gameData.homeScore,
          awayScore: gameData.awayScore,
          status: gameData.status,
          completedAt: gameData.completedAt,
        },
      });

      results.updated++;
      await delay(2100);
    } catch (error) {
      results.errors.push(`Game ${game.externalId}: ${String(error)}`);
    }
  }
}

// Also allow GET for easy browser testing
export async function GET(req: Request) {
  return POST(req);
}
