"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTicketStore } from "@/stores/ticket-store";
import { MIN_PARLAY_GAMES, MAX_PARLAY_GAMES } from "@/lib/constants";
import type { GameResponse } from "@/lib/types";

export default function GamesPage() {
  const params = useParams();
  const sport = (params.sport as string).toUpperCase();
  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { selectedGames, addGame, removeGame } = useTicketStore();

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch(`/api/games?sport=${sport}`);
        if (!res.ok) throw new Error("Failed to fetch games");
        const data = await res.json();
        setGames(data.games);
      } catch {
        setError("Failed to load games");
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, [sport]);

  const sportLabel = sport === "EPL" ? "English Premier League" : "NFL";
  const selectedCount = selectedGames.length;
  const canBuild = selectedCount >= MIN_PARLAY_GAMES;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-brand-surface rounded animate-pulse w-48" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-brand-surface rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{sportLabel}</h1>
          <p className="text-brand-muted text-sm">
            Select {MIN_PARLAY_GAMES}-{MAX_PARLAY_GAMES} games for your parlay
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-brand-muted hover:text-white text-sm"
        >
          Change Sport
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 mb-4">
          {error}
        </div>
      )}

      {games.length === 0 && !error ? (
        <div className="bg-brand-card border border-brand-border rounded-lg p-8 text-center">
          <p className="text-brand-muted">
            No upcoming {sportLabel} games available right now.
          </p>
          <p className="text-brand-muted text-sm mt-2">
            Games appear when they&apos;re scheduled within the current betting window.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const isSelected = selectedGames.some(
              (g) => g.gameId === game.id
            );
            const selectedPick = selectedGames.find(
              (g) => g.gameId === game.id
            )?.pickedTeam;
            const atMax = selectedCount >= MAX_PARLAY_GAMES && !isSelected;

            return (
              <GameRow
                key={game.id}
                game={game}
                isSelected={isSelected}
                selectedPick={selectedPick}
                disabled={atMax}
                onPickHome={() => {
                  if (isSelected && selectedPick === game.homeTeam) {
                    removeGame(game.id);
                  } else if (isSelected) {
                    removeGame(game.id);
                    addGame(
                      {
                        gameId: game.id,
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                        homeTeamBadge: game.homeTeamBadge,
                        awayTeamBadge: game.awayTeamBadge,
                        scheduledStart: game.scheduledStart,
                      },
                      game.homeTeam
                    );
                  } else {
                    addGame(
                      {
                        gameId: game.id,
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                        homeTeamBadge: game.homeTeamBadge,
                        awayTeamBadge: game.awayTeamBadge,
                        scheduledStart: game.scheduledStart,
                      },
                      game.homeTeam
                    );
                  }
                }}
                onPickAway={() => {
                  if (isSelected && selectedPick === game.awayTeam) {
                    removeGame(game.id);
                  } else if (isSelected) {
                    removeGame(game.id);
                    addGame(
                      {
                        gameId: game.id,
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                        homeTeamBadge: game.homeTeamBadge,
                        awayTeamBadge: game.awayTeamBadge,
                        scheduledStart: game.scheduledStart,
                      },
                      game.awayTeam
                    );
                  } else {
                    addGame(
                      {
                        gameId: game.id,
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                        homeTeamBadge: game.homeTeamBadge,
                        awayTeamBadge: game.awayTeamBadge,
                        scheduledStart: game.scheduledStart,
                      },
                      game.awayTeam
                    );
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* Floating ticket summary */}
      {selectedCount > 0 && (
        <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-brand-card border border-brand-green rounded-lg p-4 shadow-lg shadow-brand-green/10 z-40">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-brand-green font-bold">
                {selectedCount} game{selectedCount !== 1 ? "s" : ""} selected
              </span>
              <span className="text-brand-muted text-sm ml-2">
                {selectedCount < MIN_PARLAY_GAMES
                  ? `(need ${MIN_PARLAY_GAMES - selectedCount} more)`
                  : ""}
              </span>
            </div>
            <Link
              href="/ticket"
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                canBuild
                  ? "bg-brand-green text-brand-dark hover:bg-green-400"
                  : "bg-brand-surface text-brand-muted cursor-not-allowed"
              }`}
              onClick={(e) => !canBuild && e.preventDefault()}
            >
              Build Ticket
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function GameRow({
  game,
  isSelected,
  selectedPick,
  disabled,
  onPickHome,
  onPickAway,
}: {
  game: GameResponse;
  isSelected: boolean;
  selectedPick?: string;
  disabled: boolean;
  onPickHome: () => void;
  onPickAway: () => void;
}) {
  const gameTime = new Date(game.scheduledStart).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className={`bg-brand-card border rounded-lg p-4 transition-colors ${
        isSelected ? "border-brand-green" : "border-brand-border"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div className="text-xs text-brand-muted mb-2">{gameTime} EST</div>

      <div className="flex items-center gap-2">
        {/* Home team pick */}
        <button
          onClick={onPickHome}
          disabled={disabled && !isSelected}
          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
            selectedPick === game.homeTeam
              ? "bg-brand-green/20 border-brand-green text-brand-green"
              : "border-brand-border text-gray-300 hover:border-gray-500"
          } ${disabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {game.homeTeam}
        </button>

        <span className="text-brand-muted text-xs font-medium">VS</span>

        {/* Away team pick */}
        <button
          onClick={onPickAway}
          disabled={disabled && !isSelected}
          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
            selectedPick === game.awayTeam
              ? "bg-brand-green/20 border-brand-green text-brand-green"
              : "border-brand-border text-gray-300 hover:border-gray-500"
          } ${disabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {game.awayTeam}
        </button>
      </div>
    </div>
  );
}
