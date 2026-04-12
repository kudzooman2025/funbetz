/**
 * modular11.com scraper — fetches playoff match results for the
 * VA26 U13 AD bracket challenge.
 *
 * modular11 is a youth soccer platform used by MLS NEXT.
 * Their match data is available at predictable URLs.
 *
 * Playoff match IDs:
 *   QF:    19819, 19820, 19821, 19822  (order = QF seeds 1-4: A1vB1, C1vD1, E1vF1, G1vH1)
 *   SF:    19803, 19804
 *   Final: 19832
 */

export interface ScrapedMatch {
  matchId: number;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;     // team name if complete, null otherwise
  completed: boolean;
  source: "api" | "html" | "unknown";
}

export interface ScrapeResult {
  qf: Record<string, ScrapedMatch>;   // key = "1"-"4"  → matchId 19819-19822
  sf: Record<string, ScrapedMatch>;   // key = "1"-"2"  → matchId 19803-19804
  final: ScrapedMatch | null;          // matchId 19832
  errors: string[];
}

// ─── Match ID mapping ────────────────────────────────────────────────────────

const QF_MATCH_IDS: Record<string, number> = {
  "1": 19819,
  "2": 19820,
  "3": 19821,
  "4": 19822,
};

const SF_MATCH_IDS: Record<string, number> = {
  "1": 19803,
  "2": 19804,
};

const FINAL_MATCH_ID = 19832;

// ─── Fetch helpers ───────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; FunBetzBot/1.0; +https://funbetz.life)",
  Accept: "application/json, text/html, */*",
};

const TIMEOUT_MS = 12_000;

/**
 * Try the modular11 JSON score API (undocumented but commonly used pattern).
 * Returns parsed match data or null if the endpoint doesn't respond usefully.
 */
async function tryJsonApi(matchId: number): Promise<ScrapedMatch | null> {
  const candidates = [
    `https://www.modular11.com/api/v1/games/${matchId}/`,
    `https://www.modular11.com/score/json/${matchId}/`,
    `https://www.modular11.com/api/games/${matchId}/score/`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = await res.json();

      // modular11 JSON format (best-guess — adjust if actual format differs)
      const homeTeam: string | null =
        data.home_team?.name ?? data.homeTeam ?? data.home ?? null;
      const awayTeam: string | null =
        data.away_team?.name ?? data.awayTeam ?? data.away ?? null;
      const homeScore: number | null =
        data.home_score ?? data.homeScore ?? data.home_goals ?? null;
      const awayScore: number | null =
        data.away_score ?? data.awayScore ?? data.away_goals ?? null;
      const statusRaw: string =
        (data.status ?? data.game_status ?? data.state ?? "").toString().toLowerCase();

      const completed =
        statusRaw.includes("final") ||
        statusRaw.includes("complete") ||
        statusRaw.includes("ft") ||
        (homeScore !== null && awayScore !== null && statusRaw !== "");

      let winner: string | null = null;
      if (completed && homeScore !== null && awayScore !== null && homeTeam && awayTeam) {
        if (homeScore > awayScore) winner = homeTeam;
        else if (awayScore > homeScore) winner = awayTeam;
        // Draws in knockout → no winner yet (might go to penalties)
      }

      if (homeTeam || awayTeam) {
        return { matchId, homeTeam, awayTeam, homeScore, awayScore, winner, completed, source: "api" };
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}

/**
 * Fall back to HTML scraping of the match page.
 * Looks for common score patterns in the page markup.
 */
async function tryHtmlScrape(matchId: number): Promise<ScrapedMatch | null> {
  const urls = [
    `https://www.modular11.com/game/${matchId}/`,
    `https://www.modular11.com/games/${matchId}/`,
    `https://www.modular11.com/schedule/game/${matchId}/`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { ...HEADERS, Accept: "text/html" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) continue;

      const html = await res.text();

      // ── Try to extract JSON-LD or inline data ──────────────────────────────
      const jsonLdMatch = html.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
      );
      if (jsonLdMatch) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ld: Record<string, any> = JSON.parse(jsonLdMatch[1]);
          if (ld["@type"] === "SportsEvent" || ld.homeTeam) {
            const homeTeam = ld.homeTeam?.name ?? null;
            const awayTeam = ld.awayTeam?.name ?? null;
            const homeScore =
              ld.homeTeam?.score ?? ld.result?.homeScore ?? null;
            const awayScore =
              ld.awayTeam?.score ?? ld.result?.awayScore ?? null;
            const completed = ld.eventStatus?.includes("Completed") ?? false;
            let winner: string | null = null;
            if (completed && homeScore !== null && awayScore !== null) {
              if (homeScore > awayScore) winner = homeTeam;
              else if (awayScore > homeScore) winner = awayTeam;
            }
            if (homeTeam || awayTeam) {
              return {
                matchId, homeTeam, awayTeam, homeScore, awayScore,
                winner, completed, source: "html",
              };
            }
          }
        } catch {
          // JSON parse failed, continue to pattern matching
        }
      }

      // ── Pattern-match scores in HTML ───────────────────────────────────────
      // Common patterns: "TeamA 2 - 1 TeamB" or score spans
      const scorePattern =
        /(\d+)\s*[-–]\s*(\d+)/;
      const scoreMatch = html.match(scorePattern);

      // Look for team names near the score
      const teamPattern =
        /<[^>]*class="[^"]*(?:home|away|team)[^"]*"[^>]*>([^<]{3,60})<\//gi;
      const teamMatches = [...html.matchAll(teamPattern)].map((m) =>
        m[1].trim()
      );

      if (scoreMatch && teamMatches.length >= 2) {
        const homeScore = parseInt(scoreMatch[1]);
        const awayScore = parseInt(scoreMatch[2]);
        const homeTeam = teamMatches[0] ?? null;
        const awayTeam = teamMatches[1] ?? null;
        const completed = html.toLowerCase().includes("final") ||
          html.toLowerCase().includes("full time");
        let winner: string | null = null;
        if (completed && homeTeam && awayTeam) {
          if (homeScore > awayScore) winner = homeTeam;
          else if (awayScore > homeScore) winner = awayTeam;
        }
        return {
          matchId, homeTeam, awayTeam, homeScore, awayScore,
          winner, completed, source: "html",
        };
      }

      // Page loaded but couldn't parse → return unknown shell
      return {
        matchId,
        homeTeam: null,
        awayTeam: null,
        homeScore: null,
        awayScore: null,
        winner: null,
        completed: false,
        source: "unknown",
      };
    } catch {
      // Try next URL
    }
  }

  return null;
}

/**
 * Fetch result for a single match, trying JSON API first then HTML.
 */
export async function fetchMatchResult(
  matchId: number
): Promise<ScrapedMatch | null> {
  return (await tryJsonApi(matchId)) ?? (await tryHtmlScrape(matchId));
}

/**
 * Scrape all playoff match results.
 * Returns whatever could be determined; errors are collected non-fatally.
 */
export async function scrapeAllPlayoffResults(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const qf: Record<string, ScrapedMatch> = {};
  const sf: Record<string, ScrapedMatch> = {};
  let final: ScrapedMatch | null = null;

  // QF
  for (const [key, matchId] of Object.entries(QF_MATCH_IDS)) {
    try {
      const result = await fetchMatchResult(matchId);
      if (result) qf[key] = result;
      else errors.push(`QF ${key} (match ${matchId}): no data returned`);
    } catch (err) {
      errors.push(`QF ${key} (match ${matchId}): ${String(err)}`);
    }
  }

  // SF
  for (const [key, matchId] of Object.entries(SF_MATCH_IDS)) {
    try {
      const result = await fetchMatchResult(matchId);
      if (result) sf[key] = result;
      else errors.push(`SF ${key} (match ${matchId}): no data returned`);
    } catch (err) {
      errors.push(`SF ${key} (match ${matchId}): ${String(err)}`);
    }
  }

  // Final
  try {
    final = await fetchMatchResult(FINAL_MATCH_ID);
    if (!final) errors.push(`Final (match ${FINAL_MATCH_ID}): no data returned`);
  } catch (err) {
    errors.push(`Final (match ${FINAL_MATCH_ID}): ${String(err)}`);
  }

  return { qf, sf, final, errors };
}
