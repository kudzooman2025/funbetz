/**
 * Division I (FBS) college football schedule source.
 *
 * TheSportsDB's free key returns only a handful of events per round, which is
 * not enough to show a full D1 season. This module pulls the COMPLETE FBS
 * schedule from a dedicated college-football source instead.
 *
 * Two providers, chosen automatically:
 *
 *  1. CollegeFootballData (CFBD) — used when CFBD_API_KEY is set. Official,
 *     documented, free tier covers 1,000 calls/month (we use ~2/day). One
 *     call returns the entire FBS season.
 *  2. ESPN's public scoreboard — used when no CFBD key is present. Needs no
 *     key or signup, but is an undocumented endpoint, so it is treated as a
 *     best-effort fallback.
 *
 * To upgrade from ESPN to CFBD, add CFBD_API_KEY to the environment. No code
 * change is required.
 */

import type { GameStatus } from "@/generated/prisma/client";

const CFBD_BASE = process.env.CFBD_BASE_URL || "https://api.collegefootballdata.com";
const ESPN_CFB_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football";

/** Rounds >= this value represent bowls / playoff, not regular-season weeks. */
export const POSTSEASON_ROUND_OFFSET = 100;

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

export function cfbProviderName(): "cfbd" | "espn" {
  return process.env.CFBD_API_KEY ? "cfbd" : "espn";
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

// ── CollegeFootballData ─────────────────────────────────────────────────────

/**
 * CFBD has shipped both snake_case (v1) and camelCase (v2) payloads. Read
 * either so a provider-side rename can't silently break the sync.
 */
function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

async function fetchCfbdTeamLogos(): Promise<Map<string, string>> {
  const logos = new Map<string, string>();
  try {
    const res = await fetch(`${CFBD_BASE}/teams/fbs`, {
      headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) return logos;
    const teams = (await res.json()) as Record<string, unknown>[];
    for (const team of teams) {
      const school = pick<string>(team, "school");
      const teamLogos = pick<string[]>(team, "logos");
      if (school && teamLogos?.[0]) logos.set(school, teamLogos[0]);
    }
  } catch {
    // Logos are cosmetic — a failure here must not break the schedule sync.
  }
  return logos;
}

/** Pure mapper — exported so it can be unit tested without network access. */
export function normalizeCfbdRow(
  row: Record<string, unknown>,
  seasonType: "regular" | "postseason",
  logos: Map<string, string> = new Map()
): NormalizedGame | null {
  const id = pick<string | number>(row, "id");
  const startDate = pick<string>(row, "startDate", "start_date");
  const homeTeam = pick<string>(row, "homeTeam", "home_team");
  const awayTeam = pick<string>(row, "awayTeam", "away_team");
  if (!id || !startDate || !homeTeam || !awayTeam) return null;

  const week = toIntOrNull(pick(row, "week")) ?? 1;
  const completed = Boolean(pick(row, "completed"));

  return {
    externalId: `cfbd-${id}`,
    homeTeam,
    awayTeam,
    homeTeamBadge: logos.get(homeTeam) ?? null,
    awayTeamBadge: logos.get(awayTeam) ?? null,
    scheduledStart: new Date(startDate),
    round: seasonType === "postseason" ? POSTSEASON_ROUND_OFFSET + week : week,
    homeScore: toIntOrNull(pick(row, "homePoints", "home_points")),
    awayScore: toIntOrNull(pick(row, "awayPoints", "away_points")),
    status: completed ? "COMPLETED" : "SCHEDULED",
  };
}

async function fetchCfbdSeason(year: number): Promise<NormalizedGame[]> {
  const logos = await fetchCfbdTeamLogos();
  const games: NormalizedGame[] = [];

  for (const seasonType of ["regular", "postseason"] as const) {
    const url = `${CFBD_BASE}/games?year=${year}&division=fbs&seasonType=${seasonType}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`CFBD ${seasonType} request failed: ${res.status}`);
    }
    const rows = (await res.json()) as Record<string, unknown>[];

    for (const row of rows) {
      const game = normalizeCfbdRow(row, seasonType, logos);
      if (game) games.push(game);
    }
  }

  return games;
}

// ── ESPN (no API key) ───────────────────────────────────────────────────────

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

function espnStatus(name?: string, state?: string, completed?: boolean): GameStatus {
  const n = (name || "").toUpperCase();
  if (n.includes("POSTPONED") || n.includes("DELAYED")) return "POSTPONED";
  if (n.includes("CANCEL")) return "CANCELLED";
  if (completed || state === "post") return "COMPLETED";
  if (state === "in") return "IN_PROGRESS";
  return "SCHEDULED";
}

/** Pure mapper — exported so it can be unit tested without network access. */
export function normalizeEspnEvent(
  event: EspnEvent,
  seasonType: 2 | 3,
  week: number
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
    externalId: `espn-cfb-${event.id}`,
    homeTeam: homeName,
    awayTeam: awayName,
    homeTeamBadge: home?.team?.logo ?? null,
    awayTeamBadge: away?.team?.logo ?? null,
    scheduledStart: new Date(event.date),
    round: seasonType === 3 ? POSTSEASON_ROUND_OFFSET + week : week,
    homeScore: toIntOrNull(home?.score),
    awayScore: toIntOrNull(away?.score),
    status: espnStatus(statusType?.name, statusType?.state, statusType?.completed),
  };
}

async function fetchEspnWeek(
  year: number,
  seasonType: 2 | 3,
  week: number
): Promise<NormalizedGame[]> {
  // groups=80 restricts results to Division I FBS.
  const url = `${ESPN_CFB_BASE}/scoreboard?dates=${year}&seasontype=${seasonType}&week=${week}&groups=80&limit=300`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`ESPN request failed: ${res.status}`);

  const data = (await res.json()) as { events?: EspnEvent[] };
  const games: NormalizedGame[] = [];

  for (const event of data.events || []) {
    const game = normalizeEspnEvent(event, seasonType, week);
    if (game) games.push(game);
  }

  return games;
}

async function fetchEspnSeason(year: number): Promise<NormalizedGame[]> {
  const games: NormalizedGame[] = [];
  const seen = new Set<string>();

  // Regular season weeks 1-16, then bowl/playoff week.
  const requests: Array<{ seasonType: 2 | 3; week: number }> = [];
  for (let w = 1; w <= 16; w++) requests.push({ seasonType: 2, week: w });
  requests.push({ seasonType: 3, week: 1 });

  for (const { seasonType, week } of requests) {
    try {
      const weekGames = await fetchEspnWeek(year, seasonType, week);
      for (const g of weekGames) {
        if (seen.has(g.externalId)) continue;
        seen.add(g.externalId);
        games.push(g);
      }
    } catch {
      // A single missing week (e.g. a bye week that doesn't exist yet) should
      // not abort the whole season fetch.
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return games;
}

/**
 * Fetch the full Division I FBS schedule for a season, using whichever
 * provider is configured.
 */
export async function fetchFbsSeason(year: number): Promise<NormalizedGame[]> {
  return cfbProviderName() === "cfbd"
    ? fetchCfbdSeason(year)
    : fetchEspnSeason(year);
}
