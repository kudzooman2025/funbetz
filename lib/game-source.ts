import type { NormalizedGame } from "./espn-source";

export function gameSource(externalId: string): "espn-nfl" | "espn-cfb" | "cfbd" | "sportsdb" | null {
  if (externalId.startsWith("espn-nfl-")) return "espn-nfl";
  if (externalId.startsWith("espn-cfb-")) return "espn-cfb";
  if (externalId.startsWith("cfbd-")) return "cfbd";
  // Synthetic golf IDs must never be sent to SportsDB.
  return /^\d+$/.test(externalId) ? "sportsdb" : null;
}

type SeasonSource = "espn-nfl" | "espn-cfb" | "cfbd";

/** A lookup is tied to a stored event ID, never to today's preferred provider. */
export function originalSeasonLookup(fetchSeason: (source: SeasonSource, year: number) => Promise<NormalizedGame[]>) {
  const seasons = new Map<string, Promise<NormalizedGame[]>>();
  return async (game: { externalId: string; season: string | null; scheduledStart: Date }) => {
    const source = gameSource(game.externalId);
    if (!source || source === "sportsdb") throw new Error("No season provider for this event");
    const year = parseInt(game.season ?? String(game.scheduledStart.getUTCFullYear()), 10);
    if (!Number.isInteger(year)) throw new Error("Invalid game season");
    const key = `${source}:${year}`;
    if (!seasons.has(key)) seasons.set(key, fetchSeason(source, year));
    return (await seasons.get(key)!).find((g) => g.externalId === game.externalId);
  };
}
