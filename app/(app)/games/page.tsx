"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTicketStore } from "@/stores/ticket-store";
import { LEAGUES, LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";
import { MIN_PARLAY_GAMES, MAX_PARLAY_GAMES } from "@/lib/constants";
import type { GameResponse } from "@/lib/types";

export default function GamesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="h-8 bg-brand-surface rounded animate-pulse w-48" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-brand-surface rounded-lg animate-pulse" />
        ))}
      </div>
    }>
      <GamesContent />
    </Suspense>
  );
}

function GamesContent() {
  const searchParams = useSearchParams();
  const sportsParam = searchParams.get("sports")?.toUpperCase() || "";
  const sportKeys = sportsParam
    .split(",")
    .filter((s) => LEAGUE_KEYS.includes(s as LeagueKey)) as LeagueKey[];

  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showBrokePopup, setShowBrokePopup] = useState(false);

  const { selectedGames, addGame, removeGame } = useTicketStore();

  useEffect(() => {
    async function fetchGames() {
      try {
        const sportQuery = sportKeys.length > 0 ? `?sport=${sportKeys.join(",")}` : "";
        const res = await fetch(`/api/games${sportQuery}`);
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
    fetch("/api/wallet")
      .then((res) => res.json())
      .then((data) => setWalletBalance(data.balance))
      .catch(() => {});
  }, [sportsParam]);

  const selectedCount = selectedGames.length;
  const canBuild = selectedCount >= MIN_PARLAY_GAMES;

  // Group games by sport
  const gamesBySport: Record<string, GameResponse[]> = {};
  for (const game of games) {
    if (!gamesBySport[game.sport]) gamesBySport[game.sport] = [];
    gamesBySport[game.sport].push(game);
  }

  const sportLabel =
    sportKeys.length === 1
      ? LEAGUES[sportKeys[0]].name
      : `${sportKeys.length} Leagues`;

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
          Change Sports
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
            No upcoming games available right now.
          </p>
          <p className="text-brand-muted text-sm mt-2">
            Games appear when they&apos;re scheduled within the current betting window.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(gamesBySport).map(([sport, sportGames]) => {
            const config = LEAGUES[sport as LeagueKey];
            return (
              <div key={sport}>
                {/* Sport section header */}
                {Object.keys(gamesBySport).length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{config?.emoji}</span>
                    <h2 className="text-lg font-bold">{config?.name || sport}</h2>
                    <span className="text-brand-muted text-sm">
                      ({sportGames.length} game{sportGames.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {sportGames.map((game) => {
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
                          } else {
                            if (isSelected) removeGame(game.id);
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
                          } else {
                            if (isSelected) removeGame(game.id);
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
              </div>
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
            {canBuild ? (
              walletBalance === 0 ? (
                <button
                  onClick={() => setShowBrokePopup(true)}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-brand-green text-brand-dark hover:bg-green-400 transition-colors"
                >
                  Build Ticket
                </button>
              ) : (
                <Link
                  href="/ticket"
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-brand-green text-brand-dark hover:bg-green-400 transition-colors"
                >
                  Build Ticket
                </Link>
              )
            ) : (
              <span className="px-4 py-2 rounded-lg font-bold text-sm bg-brand-surface text-brand-muted cursor-not-allowed">
                Build Ticket
              </span>
            )}
          </div>
        </div>
      )}

      {/* Out of betz popup */}
      {showBrokePopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">&#128176;</div>
            <h2 className="text-xl font-bold mb-2">Hold your horses!</h2>
            <p className="text-brand-muted mb-4">You&apos;re outta betz!</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBrokePopup(false)}
                className="flex-1 py-2.5 border border-brand-border rounded-lg text-brand-muted hover:text-white transition-colors"
              >
                Close
              </button>
              <Link
                href="/wallet"
                className="flex-1 py-2.5 bg-brand-green text-brand-dark font-bold rounded-lg hover:bg-green-400 transition-colors"
              >
                Go to Wallet
              </Link>
            </div>
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
      className={`bg-brand-card border rounded-lg p-3 transition-colors ${
        isSelected ? "border-brand-green" : "border-brand-border"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        {/* Game time on the left */}
        <div className="text-[11px] text-brand-muted leading-tight text-center min-w-[60px] shrink-0">
          <div>{gameTime.split(",").slice(0, 2).join(",")}</div>
          <div>{gameTime.split(",").slice(2).join(",").trim()} ET</div>
        </div>

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
