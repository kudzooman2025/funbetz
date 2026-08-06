/**
 * ESPN public scoreboard provider.
 *
 * A single, uncapped, key-free source for full league schedules. TheSportsDB's
 * free key returns only ~5 events per request, which can never represent a
 * real season; ESPN's scoreboard returns the complete slate for a given week.
 *
 * These endpoints are public but undocumented, so every request is treated as
 * best-effort: a failed week is skipped rather than aborting the season.
 */

import type { GameStatus } from "@/generated/prisma/client";
import type { LeagueKey } from "./constants";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

/** Rounds >= this are postseason (playoffs / bowls). */
export const POSTSEASON_ROUND_OFFSET = 100;
/** Rounds >= this are preseason. */
export const PRESEASON_ROUND_OFFSET = 500;

export interface NormalizedGame {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamBadge: string | null;
  awayTeamBadge: string | null;
  scheduledStart: Date;
  round: number;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
}

interface EspnLeagueConfig {
  /** Path segment under the ESPN sports API, e.g. "football/nfl". */
  path: string;
  /** External ID prefix — kept stable per league so rows aren't churned. */
  prefix: string;
  /** Optional group filter (college football: 80 = Division I FBS). */
  groups?: number;
  preseasonWeeks: number;
  regularWeeks: number;
  postseasonWeeks: number;
}

export const ESPN_LEAGUES: Partial<Record<LeagueKey, EspnLeagueConfig>> = {
  NFL: {
    path: "football/nfl",
    prefix: "espn-nfl-",
    preseasonWeeks: 4,
    regularWeeks: 18,
    postseasonWeeks: 5,
  },
  NCAAF: {
    path: "football/college-football",
    // Historical prefix — keep so the already-loaded FBS season isn't rebuilt.
    prefix: "espn-cfb-",
    groups: 80,
    preseasonWeeks: 0,
    regularWeeks: 16,
    postseasonWeeks: 1,
  },
};

export function isEspnLeague(league: LeagueKey): boolean {
  return Boolean(ESPN_LEAGUES[league]);
}

export function espnPrefix(league: LeagueKey): string {
  return ESPN_LEAGUES[league]?.prefix ?? `espn-${league.toLowerCase()}-`;
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string; shortDisplayName?: string; logo?: string };
}

export interface EspnEvent {
  id?: string;
  date?: string;
  competitions?: {
    competitors?: EspnCompetitor[];
    status?: { type?: { state?: string; completed?: boolean; name?: string } };
  }[];
  status?: { type?: { state?: string; completed?: boolean; name?: string } };
}

export function espnStatus(
  name?: string,
  state?: string,
  completed?: boolean
): GameStatus {
  const n = (name || "").toUpperCase();
  if (n.includes("POSTPONED") || n.includes("DELAYED")) return "POSTPONED";
  if (n.includes("CANCEL")) return "CANCELLED";
  if (completed || state === "post") return "COMPLETED";
  if (state === "in") return "IN_PROGRESS";
  return "SCHEDULED";
}

/**
 * Translate an ESPN season type + week into our flat round number.
 *  preseason  -> 501, 502, ...
 *  regular    -> 1, 2, ...
 *  postseason -> 101, 102, ...
 */
export function espnRound(seasonType: 1 | 2 | 3, week: number): number {
  if (seasonType === 1) return PRESEASON_ROUND_OFFSET + week;
  if (seasonType === 3) return POSTSEASON_ROUND_OFFSET + week;
  return week;
}

/** Pure mapper — exported so it can be unit tested without network access. */
export function normalizeEspnEvent(
  event: EspnEvent,
  prefix: string,
  round: number
): NormalizedGame | null {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  const homeName = home?.team?.displayName;
  const awayName = away?.team?.displayName;
  if (!event.id || !event.date || !homeName || !awayName) return null;

  const statusType = competition?.status?.type ?? event.status?.type;

  return {
    externalId: `${prefix}${event.id}`,
    homeTeam: homeName,
    awayTeam: awayName,
    homeTeamBadge: home?.team?.logo ?? null,
    awayTeamBadge: away?.team?.logo ?? null,
    scheduledStart: new Date(event.date),
    round,
    homeScore: toIntOrNull(home?.score),
    awayScore: toIntOrNull(away?.score),
    status: espnStatus(statusType?.name, statusType?.state, statusType?.completed),
  };
}

async function fetchEspnWeek(
  config: EspnLeagueConfig,
  year: number,
  seasonType: 1 | 2 | 3,
  week: number
): Promise<NormalizedGame[]> {
  const groups = config.groups ? `&groups=${config.groups}` : "";
  const url =
    `${ESPN_BASE}/${config.path}/scoreboard` +
    `?dates=${year}&seasontype=${seasonType}&week=${week}${groups}&limit=400`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`ESPN request failed: ${res.status}`);

  const data = (await res.json()) as { events?: EspnEvent[] };
  const round = espnRound(seasonType, week);

  const games: NormalizedGame[] = [];
  for (const event of data.events || []) {
    const game = normalizeEspnEvent(event, config.prefix, round);
    if (game) games.push(game);
  }
  return games;
}

/**
 * Fetch a league's complete season — preseason, regular season and
 * postseason — from ESPN.
 */
export async function fetchEspnLeagueSeason(
  league: LeagueKey,
  year: number
): Promise<NormalizedGame[]> {
  const config = ESPN_LEAGUES[league];
  if (!config) throw new Error(`${league} has no ESPN configuration`);

  const requests: Array<{ seasonType: 1 | 2 | 3; week: number }> = [];
  for (let w = 1; w <= config.preseasonWeeks; w++)
    requests.push({ seasonType: 1, week: w });
  for (let w = 1; w <= config.regularWeeks; w++)
    requests.push({ seasonType: 2, week: w });
  for (let w = 1; w <= config.postseasonWeeks; w++)
    requests.push({ seasonType: 3, week: w });

  const games: NormalizedGame[] = [];
  const seen = new Set<string>();

  for (const { seasonType, week } of requests) {
    try {
      for (const game of await fetchEspnWeek(config, year, seasonType, week)) {
        // ESPN can echo the same event under adjacent weeks; keep the first.
        if (seen.has(game.externalId)) continue;
        seen.add(game.externalId);
        games.push(game);
      }
    } catch {
      // A single unavailable week must not abort the whole season.
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return games;
}
