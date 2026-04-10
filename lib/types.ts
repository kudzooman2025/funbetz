import type { LeagueKey } from "./constants";

export interface GameResponse {
  id: string;
  sport: LeagueKey;
  homeTeam: string;
  awayTeam: string;
  homeTeamBadge: string | null;
  awayTeamBadge: string | null;
  scheduledStart: string;
  status: string;
  round: number | null;
}

export interface ParlayGameResponse {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamBadge: string | null;
  awayTeamBadge: string | null;
  scheduledStart: string;
  pickedTeam: string;
  result: string;
  homeScore: number | null;
  awayScore: number | null;
  gameStatus: string;
}

export interface ParlayResponse {
  id: string;
  betAmount: number;
  numGames: number;
  multiplier: number;
  status: string;
  potentialPayout: number;
  createdAt: string;
  resolvedAt: string | null;
  games: ParlayGameResponse[];
  result?: {
    payoutAmount: number;
    leaderboardAdjustment: number;
    walletAdjustment: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  walletBalance: number;
  leaderboardScore: number;
}
