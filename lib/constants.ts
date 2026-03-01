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
    sport: "Soccer",
    season: "2025-2026",
    name: "English Premier League",
  },
  NFL: {
    id: "4391",
    sport: "American Football",
    season: "2025",
    name: "NFL",
  },
} as const;

export const COMPLETED_STATUSES = ["Match Finished", "FT", "AET", "PEN"];
