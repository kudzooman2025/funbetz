/**
 * Division I (FBS) college football schedule source.
 *
 * Two providers, chosen automatically:
 *
 *  1. CollegeFootballData (CFBD) — used when CFBD_API_KEY is set. Official,
 *     documented, free tier covers 1,000 calls/month (we use ~2/day). One
 *     call returns the entire FBS season.
 *  2. ESPN's public scoreboard — used when no CFBD key is present. Needs no
 *     key or signup (see lib/espn-source.ts).
 *
 * To switch from ESPN to CFBD, add CFBD_API_KEY to the environment. No code
 * change is required.
 */

import {
  fetchEspnLeagueSeason,
  POSTSEASON_ROUND_OFFSET,
  type NormalizedGame,
} from "./espn-source";

const CFBD_BASE = process.env.CFBD_BASE_URL || "https://api.collegefootballdata.com";

export function cfbProviderName(): "cfbd" | "espn" {
  return process.env.CFBD_API_KEY ? "cfbd" : "espn";
}

/** External ID prefix for whichever provider is active. */
export function cfbPrefix(): string {
  return cfbProviderName() === "cfbd" ? "cfbd-" : "espn-cfb-";
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

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

/**
 * Fetch the full Division I FBS schedule for a season, using whichever
 * provider is configured.
 */
export async function fetchFbsSeason(year: number): Promise<NormalizedGame[]> {
  return cfbProviderName() === "cfbd"
    ? fetchCfbdSeason(year)
    : fetchEspnLeagueSeason("NCAAF", year);
}
