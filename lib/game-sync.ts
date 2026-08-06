/**
 * Shared game-sync engine.
 *
 * Used by /api/cron/sync-games (nightly rolling window) and
 * /api/cron/backfill-season (one-off full-season load), so the upsert rules
 * live in exactly one place.
 *
 * NOTE ON DATA COMPLETENESS: TheSportsDB's free API key returns only the
 * first few events per round. Backfilling every round still gives full
 * season COVERAGE (every week appears), just not every game within a week.
 * Swapping SPORTSDB_API_KEY for a paid key fills in the rest with no code
 * change.
 */

import { LEAGUES, LEAGUE_KEYS, type LeagueKey } from "./constants";
import { prisma } from "./prisma";
import { fetchFbsSeason, cfbProviderName } from "./cfb-source";
import {
  fetchRoundEvents,
  fetchEventById,
  parseEventToGameData,
  leagueKeyFromEvent,
  delay,
  type SportsDBEvent,
} from "./sports-api";

export interface SyncResults {
  synced: number;
  updated: number;
  errors: string[];
}

/** Stay under TheSportsDB's 30 req/min free-tier rate limit. */
const REQUEST_DELAY_MS = 2100;

export async function upsertEvents(
  events: SportsDBEvent[],
  league: LeagueKey,
  results: SyncResults
) {
  for (const event of events) {
    const gameData = parseEventToGameData(event, league);

    await prisma.game.upsert({
      where: { externalId: gameData.externalId },
      update: {
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        status: gameData.status,
        homeTeamBadge: gameData.homeTeamBadge,
        awayTeamBadge: gameData.awayTeamBadge,
        // Refresh kickoff time + round so postponed/flexed games (common in
        // the NFL) get corrected — the 1-hour betting lock depends on
        // scheduledStart being accurate.
        scheduledStart: gameData.scheduledStart,
        round: gameData.round,
      },
      create: gameData,
    });

    // Set completedAt only once (first time the game is marked completed)
    if (gameData.status === "COMPLETED") {
      await prisma.game.updateMany({
        where: { externalId: gameData.externalId, completedAt: null },
        data: { completedAt: new Date() },
      });
    }

    results.synced++;
  }
}

/** Preseason round number for a league, if it has one (NFL = 500). */
function preseasonRoundFor(league: LeagueKey): number | undefined {
  return (LEAGUES[league] as { preseasonRound?: number }).preseasonRound;
}

function seasonHasStarted(league: LeagueKey): boolean {
  return new Date() >= new Date(`${LEAGUES[league].seasonStart}T00:00:00Z`);
}

/**
 * Nightly sync: a rolling window around the current round, plus preseason
 * while the regular season hasn't started.
 */
export async function syncLeagueRounds(
  league: LeagueKey,
  results: SyncResults
) {
  const config = LEAGUES[league];

  // Find the current round from the DB
  const upcomingGame = await prisma.game.findFirst({
    where: { sport: league, status: "SCHEDULED", scheduledStart: { gte: new Date() } },
    orderBy: { round: "asc" },
    select: { round: true },
  });

  let currentRound: number;
  if (upcomingGame?.round) {
    currentRound = upcomingGame.round;
  } else {
    // Data-driven round estimation from the calendar
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
      await upsertEvents(events, league, results);
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      results.errors.push(`${league} round ${r}: ${String(error)}`);
    }
  }

  const preseasonRound = preseasonRoundFor(league);
  if (preseasonRound && !seasonHasStarted(league)) {
    try {
      const events = await fetchRoundEvents(league, preseasonRound);
      await upsertEvents(events, league, results);
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      results.errors.push(`${league} preseason: ${String(error)}`);
    }
  }
}

/**
 * Full-season backfill: walk EVERY round of the league's season so the whole
 * schedule is in the DB up front. Games are still only bettable once they
 * fall inside the betting window (see lib/utils.getBettingWindow) — the
 * schedule is visible immediately, betting opens on time.
 *
 * One league per call keeps the request comfortably inside the function
 * timeout (18 rounds x ~2.1s is well under a minute).
 */
export async function syncFullSeason(
  league: LeagueKey,
  results: SyncResults
): Promise<{ roundsFetched: number }> {
  const config = LEAGUES[league];
  let roundsFetched = 0;

  const preseasonRound = preseasonRoundFor(league);
  if (preseasonRound && !seasonHasStarted(league)) {
    try {
      const events = await fetchRoundEvents(league, preseasonRound);
      await upsertEvents(events, league, results);
      roundsFetched++;
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      results.errors.push(`${league} preseason: ${String(error)}`);
    }
  }

  for (let r = 1; r <= config.totalRounds; r++) {
    try {
      const events = await fetchRoundEvents(league, r);
      await upsertEvents(events, league, results);
      roundsFetched++;
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      results.errors.push(`${league} round ${r}: ${String(error)}`);
    }
  }

  return { roundsFetched };
}

/** Refresh games that sit in an active parlay but aren't finished yet. */
export async function updateActiveParlayGames(results: SyncResults) {
  const pendingGames = await prisma.game.findMany({
    where: {
      status: { not: "COMPLETED" },
      parlayGames: { some: { parlay: { status: "PENDING" } } },
      // College football is refreshed by syncCfbSeason from its own provider;
      // its external IDs are not TheSportsDB event IDs.
      sport: { not: "NCAAF" },
    },
    select: { externalId: true, id: true, sport: true },
  });

  for (const game of pendingGames) {
    try {
      const event = await fetchEventById(game.externalId);
      if (!event) continue;

      // Use league ID lookup, fall back to the DB sport
      const sport = leagueKeyFromEvent(event) ?? (game.sport as LeagueKey);
      const gameData = parseEventToGameData(event, sport);

      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: gameData.homeScore,
          awayScore: gameData.awayScore,
          status: gameData.status,
          completedAt: gameData.completedAt,
          scheduledStart: gameData.scheduledStart,
          round: gameData.round,
        },
      });

      results.updated++;
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      results.errors.push(`Game ${game.externalId}: ${String(error)}`);
    }
  }
}

/**
 * Division I (FBS) college football — full-season sync.
 *
 * Unlike the round-by-round leagues, the whole FBS schedule arrives in one
 * pass from a dedicated college-football provider (see lib/cfb-source.ts),
 * so every week of the season lands in the DB at once. Betting still opens
 * per the weekly window; the rest of the schedule is simply visible.
 */
export async function syncCfbSeason(
  results: SyncResults
): Promise<{ provider: string; fetched: number; removedStale: number }> {
  const config = LEAGUES.NCAAF;
  const season = parseInt(config.season, 10);
  const provider = cfbProviderName();

  const games = await fetchFbsSeason(season);
  if (games.length === 0) {
    results.errors.push(`NCAAF: ${provider} returned no games for ${season}`);
    return { provider, fetched: 0, removedStale: 0 };
  }

  // Drop NCAAF rows that came from a different provider (e.g. the old
  // TheSportsDB import) so the same matchup can't appear twice. Anything
  // already attached to a parlay is left untouched.
  const prefix = provider === "cfbd" ? "cfbd-" : "espn-cfb-";
  const removed = await prisma.game.deleteMany({
    where: {
      sport: "NCAAF",
      NOT: { externalId: { startsWith: prefix } },
      parlayGames: { none: {} },
    },
  });

  // Upsert in batches — one round trip per batch instead of per game.
  const BATCH_SIZE = 50;
  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((g) =>
        prisma.game.upsert({
          where: { externalId: g.externalId },
          update: {
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            status: g.status,
            homeTeamBadge: g.homeTeamBadge,
            awayTeamBadge: g.awayTeamBadge,
            scheduledStart: g.scheduledStart,
            round: g.round,
          },
          create: {
            externalId: g.externalId,
            sport: "NCAAF",
            league: config.name,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            homeTeamBadge: g.homeTeamBadge,
            awayTeamBadge: g.awayTeamBadge,
            scheduledStart: g.scheduledStart,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            status: g.status,
            round: g.round,
            season: config.season,
          },
        })
      )
    );
    results.synced += batch.length;
  }

  // Stamp completedAt once for newly finished games (drives the resolver's
  // settle delay).
  await prisma.game.updateMany({
    where: { sport: "NCAAF", status: "COMPLETED", completedAt: null },
    data: { completedAt: new Date() },
  });

  return { provider, fetched: games.length, removedStale: removed.count };
}

/**
 * Nightly sync across every league: college football pulls its full season
 * from its own provider, everything else uses the rolling round window.
 */
export async function syncAllLeagues(results: SyncResults) {
  for (const key of LEAGUE_KEYS) {
    // Golf leagues are manually seeded; skip auto-sync
    if ((LEAGUES[key] as { skipSync?: boolean }).skipSync) continue;

    if (key === "NCAAF") {
      try {
        await syncCfbSeason(results);
      } catch (error) {
        results.errors.push(`NCAAF season sync: ${String(error)}`);
      }
      continue;
    }

    await syncLeagueRounds(key, results);
    await delay(2500);
  }

  await updateActiveParlayGames(results);
}
