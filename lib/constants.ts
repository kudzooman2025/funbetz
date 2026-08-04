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
    season: "2026-2027",
    name: "English Premier League",
    emoji: "\u26BD",
    description: "Pick winners from EPL soccer matches",
    seasonStart: "2026-08-21",
    totalRounds: 38,
    roundsPerWeek: 1,
    completedStatuses: ["Match Finished", "FT", "AET", "PEN"],
  },
  NFL: {
    id: "4391",
    strSport: "American Football",
    season: "2026",
    name: "NFL",
    emoji: "\uD83C\uDFC8",
    description: "Pick winners from NFL football games",
    seasonStart: "2026-09-09",
    totalRounds: 18,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "FT", "AOT", "Final"],
    // TheSportsDB stores NFL preseason games as round 500; synced until the
    // regular season starts (see sync-games).
    preseasonRound: 500,
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
    season: "2026-2027",
    name: "NBA",
    emoji: "\uD83C\uDFC0",
    description: "Pick winners from NBA basketball games",
    seasonStart: "2026-10-20",
    totalRounds: 26,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "Final"],
  },
  NHL: {
    id: "4380",
    strSport: "Ice Hockey",
    season: "2026-2027",
    name: "NHL",
    emoji: "\uD83C\uDFD2",
    description: "Pick winners from NHL hockey games",
    seasonStart: "2026-09-29",
    totalRounds: 26,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "Final", "SO"],
  },
  NCAAF: {
    id: "4479",
    strSport: "American Football",
    season: "2026",
    name: "College Football",
    emoji: "\uD83C\uDFC8",
    description: "Pick winners from D1 college football",
    seasonStart: "2026-08-29",
    totalRounds: 15,
    roundsPerWeek: 1,
    completedStatuses: ["Game Over", "FT", "AOT", "Final"],
  },
  PGA: {
    id: "4452",
    strSport: "Golf",
    season: "2025-2026",
    name: "PGA Tour",
    emoji: "\u26F3",
    description: "Pick round leaders in PGA Tour player matchups",
    seasonStart: "2025-10-02",
    totalRounds: 160,
    roundsPerWeek: 4,
    completedStatuses: ["Round Over", "Final"],
    skipSync: true,
  },
  LIV: {
    id: "0",
    strSport: "Golf",
    season: "2026",
    name: "LIV Golf",
    emoji: "\u26F3",
    description: "Pick round leaders in LIV Golf player matchups",
    seasonStart: "2026-02-06",
    totalRounds: 48,
    roundsPerWeek: 3,
    completedStatuses: ["Round Over", "Final"],
    skipSync: true,
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
