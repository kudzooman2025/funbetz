import { LEAGUES, ALL_COMPLETED_STATUSES, LEAGUE_ID_TO_KEY, type LeagueKey } from "./constants";
import { GameStatus } from "@/generated/prisma/client";

const BASE_URL = process.env.SPORTSDB_BASE_URL || "https://www.thesportsdb.com/api/v1/json";
const API_KEY = process.env.SPORTSDB_API_KEY || "3";

export interface SportsDBEvent {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  dateEvent: string;
  strTime: string;
  strTimestamp: string;
  strStatus: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strSport: string;
  strLeague: string;
  idLeague: string;
  intRound: string;
  strSeason: string;
}

/**
 * Determine our league key from a TheSportsDB event using its league ID.
 */
export function leagueKeyFromEvent(event: SportsDBEvent): LeagueKey | undefined {
  return LEAGUE_ID_TO_KEY[event.idLeague];
}

/**
 * Fetch all events for a given round in a league.
 */
export async function fetchRoundEvents(
  leagueKey: LeagueKey,
  round: number
): Promise<SportsDBEvent[]> {
  const league = LEAGUES[leagueKey];
  const url = `${BASE_URL}/${API_KEY}/eventsround.php?id=${league.id}&r=${round}&s=${league.season}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("TheSportsDB rate limit exceeded");
    }
    throw new Error(`TheSportsDB API error: ${res.status}`);
  }
  const data = await res.json();
  return data.events || [];
}

/**
 * Look up a single event by its ID.
 */
export async function fetchEventById(
  eventId: string
): Promise<SportsDBEvent | null> {
  const url = `${BASE_URL}/${API_KEY}/lookupevent.php?id=${eventId}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.events?.[0] || null;
}

/**
 * Fetch all events for the current season (limited to 15 per call on free tier).
 */
export async function fetchSeasonEvents(
  leagueKey: LeagueKey
): Promise<SportsDBEvent[]> {
  const league = LEAGUES[leagueKey];
  const url = `${BASE_URL}/${API_KEY}/eventsseason.php?id=${league.id}&s=${league.season}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.events || [];
}

/**
 * Map TheSportsDB status string to our GameStatus enum.
 */
export function mapApiStatusToGameStatus(
  apiStatus: string | null
): GameStatus {
  if (!apiStatus || apiStatus === "Not Started" || apiStatus === "NS" || apiStatus === "") {
    return "SCHEDULED";
  }
  if (ALL_COMPLETED_STATUSES.includes(apiStatus)) {
    return "COMPLETED";
  }
  if (apiStatus === "Match Postponed" || apiStatus === "Postponed") {
    return "POSTPONED";
  }
  if (apiStatus === "Cancelled" || apiStatus === "Abandoned") {
    return "CANCELLED";
  }
  // In-progress statuses: "1H", "2H", "HT", "ET", "Q1", "Q2", etc.
  return "IN_PROGRESS";
}

/**
 * Parse a TheSportsDB event into the data shape needed for our Game model.
 */
export function parseEventToGameData(
  event: SportsDBEvent,
  sport: LeagueKey
) {
  const status = mapApiStatusToGameStatus(event.strStatus);
  const homeScore =
    event.intHomeScore !== null && event.intHomeScore !== ""
      ? parseInt(event.intHomeScore, 10)
      : null;
  const awayScore =
    event.intAwayScore !== null && event.intAwayScore !== ""
      ? parseInt(event.intAwayScore, 10)
      : null;

  return {
    externalId: event.idEvent,
    sport,
    league: event.strLeague,
    homeTeam: event.strHomeTeam,
    awayTeam: event.strAwayTeam,
    homeTeamBadge: event.strHomeTeamBadge || null,
    awayTeamBadge: event.strAwayTeamBadge || null,
    scheduledStart: new Date(event.strTimestamp || `${event.dateEvent}T${event.strTime}`),
    homeScore,
    awayScore,
    status,
    round: event.intRound ? parseInt(event.intRound, 10) : null,
    season: event.strSeason || LEAGUES[sport].season,
    completedAt: status === "COMPLETED" ? new Date() : null,
  };
}

/**
 * Delay helper for rate limiting.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
