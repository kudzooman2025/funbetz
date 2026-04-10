export const MULTIPLIERS: Record<number, number> = {
  3: 5,
  4: 10,
  5: 20,
  6: 40,
  7: 80,
  8: 150,
};

export const WALLET_MAX = 1000;
export const WALLET_STARTING = 1000;
export const REPLENISH_MIN = 100;
export const REPLENISH_MAX = 1000;
export const BET_MIN = 1;
export const GAME_BUFFER_HOURS = 1;
export const MIN_PARLAY_GAMES = 3;
export const MAX_PARLAY_GAMES = 8;

export const LEAGUES = {
  EPL: {
    id: "4328",
    strSport: "Soccer",
    season: "2025-2026",
    name: "English Premier League",
    emoji: "\u26BD",
    description: "Pick winners from EPL soccer matches",
    seasonStart: "2025-08-16",
    totalRounds: 38,
    roundsPerWeek: 1,
    completedStatuses: ["Match Finished", "FT", "AET", "PEN"],
  },
  NFL: {
    id: "4391",
    strSport: "American Football",
    season: "2025",
    name: "NFL",
    emoji: "\uD83C\uDFC8",
    description: "Pick winners from NFL football games",
    seasonStart: "2025-09-04",
    totalRounds: 18,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "FT"],
  },
  MLB: {
    id: "4424",
    strSport: "Baseball",
    season: "2026",
    name: "MLB",
    emoji: "\u26BE",
    description: "Pick winners from MLB baseball games",
    seasonStart: "2026-03-25",
    totalRounds: 26,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "Final"],
  },
  NBA: {
    id: "4387",
    strSport: "Basketball",
    season: "2025-2026",
    name: "NBA",
    emoji: "\uD83C\uDFC0",
    description: "Pick winners from NBA basketball games",
    seasonStart: "2025-10-21",
    totalRounds: 26,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "Final"],
  },
  NHL: {
    id: "4380",
    strSport: "Ice Hockey",
    season: "2025-2026",
    name: "NHL",
    emoji: "\uD83C\uDFD2",
    description: "Pick winners from NHL hockey games",
    seasonStart: "2025-10-07",
    totalRounds: 26,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "Final", "SO"],
  },
  NCAAF: {
    id: "4479",
    strSport: "American Football",
    season: "2025",
    name: "College Football",
    emoji: "\uD83C\uDFC8",
    description: "Pick winners from D1 college football",
    seasonStart: "2025-08-30",
    totalRounds: 15,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "FT"],
  },
  WORLD_CUP: {
    id: "4484",
    strSport: "Soccer",
    season: "2026",
    name: "FIFA World Cup 2026",
    emoji: "\uD83C\uDFC6",
    description: "Pick winners from the 2026 FIFA World Cup",
    seasonStart: "2026-06-11",
    totalRounds: 7,
    roundsPerWeek: 1,
    completedStatuses: ["Match Finished", "FT", "AET", "PEN"],
    featured: true,
  },
} as const;

/** Derived union type of all league keys */
export type LeagueKey = keyof typeof LEAGUES;

/** Array of all league keys for iteration */
export const LEAGUE_KEYS = Object.keys(LEAGUES) as LeagueKey[];

/** All unique completed statuses across all sports */
export const ALL_COMPLETED_STATUSES: string[] = [
  ...new Set(Object.values(LEAGUES).flatMap((l) => [...l.completedStatuses])),
];

/** Reverse lookup: TheSportsDB league ID → our league key */
export const LEAGUE_ID_TO_KEY: Record<string, LeagueKey> = Object.fromEntries(
  Object.entries(LEAGUES).map(([key, val]) => [val.id, key as LeagueKey])
) as Record<string, LeagueKey>;
