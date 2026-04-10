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

export interface TournamentSummary {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: { id: string; username: string };
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  description: string | null;
  createdAt: string;
  sports: string[];
  memberCount: number;
  isCreator: boolean;
  isMember: boolean;
}

export interface TournamentDetail extends TournamentSummary {
  members: { userId: string; username: string; joinedAt: string }[];
}

export interface TournamentLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  isCurrentUser: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  walletBalance: number;
  leaderboardScore: number;
}
