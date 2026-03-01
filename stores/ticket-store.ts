import { create } from "zustand";
import { MULTIPLIERS, MAX_PARLAY_GAMES } from "@/lib/constants";

export interface SelectedGame {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamBadge: string | null;
  awayTeamBadge: string | null;
  pickedTeam: string;
  scheduledStart: string;
}

interface TicketStore {
  selectedGames: SelectedGame[];
  betAmount: number;
  addGame: (
    game: Omit<SelectedGame, "pickedTeam">,
    pickedTeam: string
  ) => void;
  removeGame: (gameId: string) => void;
  updatePick: (gameId: string, pickedTeam: string) => void;
  setBetAmount: (amount: number) => void;
  clear: () => void;
  getMultiplier: () => number;
  getPayout: () => number;
}

export const useTicketStore = create<TicketStore>((set, get) => ({
  selectedGames: [],
  betAmount: 10,

  addGame: (game, pickedTeam) => {
    const { selectedGames } = get();
    if (selectedGames.length >= MAX_PARLAY_GAMES) return;
    if (selectedGames.some((g) => g.gameId === game.gameId)) return;

    set({
      selectedGames: [...selectedGames, { ...game, pickedTeam }],
    });
  },

  removeGame: (gameId) => {
    set({
      selectedGames: get().selectedGames.filter((g) => g.gameId !== gameId),
    });
  },

  updatePick: (gameId, pickedTeam) => {
    set({
      selectedGames: get().selectedGames.map((g) =>
        g.gameId === gameId ? { ...g, pickedTeam } : g
      ),
    });
  },

  setBetAmount: (amount) => {
    set({ betAmount: Math.max(1, Math.round(amount)) });
  },

  clear: () => {
    set({ selectedGames: [], betAmount: 10 });
  },

  getMultiplier: () => {
    const count = get().selectedGames.length;
    return MULTIPLIERS[count] || 0;
  },

  getPayout: () => {
    const multiplier = get().getMultiplier();
    return get().betAmount * multiplier;
  },
}));
