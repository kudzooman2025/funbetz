import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchRoundEvents,
  fetchEventById,
  parseEventToGameData,
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
    // Sync EPL rounds - fetch a range of rounds around current time
    await syncLeagueRounds("EPL", results);
    await delay(2000); // Rate limit buffer
    // Sync NFL rounds
    await syncLeagueRounds("NFL", results);

    // Also update games that are in active parlays
    await updateActiveParlayGames(results);
  } catch (error) {
    results.errors.push(String(error));
  }

  return NextResponse.json(results);
}

async function syncLeagueRounds(
  league: "EPL" | "NFL",
  results: { synced: number; updated: number; errors: string[] }
) {
  // Find the current round: the latest round that has SCHEDULED or recent games
  // First check if we have any games with upcoming dates
  const upcomingGame = await prisma.game.findFirst({
    where: { sport: league, status: "SCHEDULED", scheduledStart: { gte: new Date() } },
    orderBy: { round: "asc" },
    select: { round: true },
  });

  // If no upcoming games in DB, use a smart default based on date
  let currentRound: number;
  if (upcomingGame?.round) {
    currentRound = upcomingGame.round;
  } else {
    // Estimate the current round from the calendar
    // EPL: season starts mid-Aug, ~1 round per week, 38 rounds
    // NFL: season starts early Sep, ~1 round per week, 18 weeks
    const now = new Date();
    if (league === "EPL") {
      const seasonStart = new Date("2025-08-16"); // EPL 2025-2026 approx start
      const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      currentRound = Math.max(1, Math.min(38, weeksSinceStart + 1));
    } else {
      const seasonStart = new Date("2025-09-04"); // NFL 2025 approx start
      const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      currentRound = Math.max(1, Math.min(18, weeksSinceStart + 1));
    }
  }

  // Fetch current round and next 3 rounds (covers ~1 month of games)
  for (let r = Math.max(1, currentRound - 1); r <= currentRound + 3; r++) {
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
    select: { externalId: true, id: true },
  });

  for (const game of pendingGames) {
    try {
      const event = await fetchEventById(game.externalId);
      if (!event) continue;

      const gameData = parseEventToGameData(
        event,
        event.strSport === "Soccer" ? "EPL" : "NFL"
      );

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
