"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTicketStore } from "@/stores/ticket-store";
import { LEAGUES, LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";
import { MIN_PARLAY_GAMES, MAX_PARLAY_GAMES, GAME_BUFFER_HOURS } from "@/lib/constants";
import type { GameResponse } from "@/lib/types";

const WC_ROUND_NAMES: Record<number, string> = {
  1: "Group Stage · Matchday 1",
  2: "Group Stage · Matchday 2",
  3: "Group Stage · Matchday 3",
  4: "Round of 32",
  5: "Round of 16",
  6: "Quarterfinals",
  7: "Semifinals & Final",
};

const PGA_ROUND_NAMES: Record<number, string> = {
  1: "Round 1 · Thursday",
  2: "Round 2 · Friday",
  3: "Round 3 · Saturday (Moving Day)",
  4: "Round 4 · Sunday (Final Round)",
};

const LIV_ROUND_NAMES: Record<number, string> = {
  1: "Round 1 · Friday",
  2: "Round 2 · Saturday",
  3: "Round 3 · Sunday (Final Round)",
};

const GOLF_SPORTS = new Set<LeagueKey>(["PGA", "LIV"]);

function getBettingWindowBounds() {
  const now = new Date();
  const start = new Date(now.getTime() + GAME_BUFFER_HOURS * 60 * 60 * 1000);
  const dayOfWeek = now.getUTCDay();
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + daysUntilNextSunday);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

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

  const isWorldCupOnly = sportKeys.length === 1 && sportKeys[0] === "WORLD_CUP";
  const isGolfOnly = sportKeys.length > 0 && sportKeys.every((k) => GOLF_SPORTS.has(k));

  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showBrokePopup, setShowBrokePopup] = useState(false);

  const { selectedGames, addGame, removeGame } = useTicketStore();

  useEffect(() => {
    async function fetchGames() {
      try {
        const params = new URLSearchParams();
        if (sportKeys.length > 0) params.set("sport", sportKeys.join(","));
        if (isWorldCupOnly) params.set("preview", "true");
        const res = await fetch(`/api/games?${params.toString()}`);
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

  // Compute betting window bounds client-side for bettability checks
  const { start: windowStart, end: windowEnd } = getBettingWindowBounds();

  // Group games by sport
  const gamesBySport: Record<string, GameResponse[]> = {};
  for (const game of games) {
    if (!gamesBySport[game.sport]) gamesBySport[game.sport] = [];
    gamesBySport[game.sport].push(game);
  }

  // For World Cup preview: group games by round number
  const wcGamesByRound: Record<number, GameResponse[]> = {};
  if (isWorldCupOnly) {
    for (const game of games) {
      const r = game.round ?? 0;
      if (!wcGamesByRound[r]) wcGamesByRound[r] = [];
      wcGamesByRound[r].push(game);
    }
  }

  // For golf: group by tournament (league) → round
  // Structure: { "The Masters 2026": { 1: [...], 2: [...] }, ... }
  const golfByTournament: Record<string, { sport: LeagueKey; rounds: Record<number, GameResponse[]> }> = {};
  if (isGolfOnly) {
    for (const game of games) {
      const tName = game.league;
      const r = game.round ?? 1;
      if (!golfByTournament[tName]) golfByTournament[tName] = { sport: game.sport, rounds: {} };
      if (!golfByTournament[tName].rounds[r]) golfByTournament[tName].rounds[r] = [];
      golfByTournament[tName].rounds[r].push(game);
    }
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
      ) : isGolfOnly ? (
        /* ── Golf: grouped by tournament → round ── */
        <div className="space-y-10">
          {Object.entries(golfByTournament).map(([tournamentName, { sport, rounds }]) => {
            const roundNames = sport === "LIV" ? LIV_ROUND_NAMES : PGA_ROUND_NAMES;
            const sortedRounds = Object.keys(rounds).map(Number).sort((a, b) => a - b);
            return (
              <div key={tournamentName}>
                {/* Tournament header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">⛳</span>
                  <div>
                    <h2 className="text-lg font-bold">{tournamentName}</h2>
                    <p className="text-xs text-brand-muted">
                      {sport === "LIV" ? "LIV Golf · 54-hole individual stroke play" : "PGA Tour · Round leader matchups"}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {sortedRounds.map((roundNum) => {
                    const roundGames = rounds[roundNum];
                    const roundLabel = roundNames[roundNum] ?? `Round ${roundNum}`;
                    return (
                      <div key={roundNum}>
                        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
                          {roundLabel}
                        </p>
                        <div className="space-y-2">
                          {roundGames.map((game) => {
                            const isSelected = selectedGames.some((g) => g.gameId === game.id);
                            const selectedPick = selectedGames.find((g) => g.gameId === game.id)?.pickedTeam;
                            const atMax = selectedCount >= MAX_PARLAY_GAMES && !isSelected;
                            return (
                              <GameRow
                                key={game.id}
                                game={game}
                                isSelected={isSelected}
                                selectedPick={selectedPick}
                                disabled={atMax}
                                bettable={true}
                                isGolf={true}
                                onPickHome={() => {
                                  if (isSelected && selectedPick === game.homeTeam) {
                                    removeGame(game.id);
                                  } else {
                                    if (isSelected) removeGame(game.id);
                                    addGame({ gameId: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, homeTeamBadge: game.homeTeamBadge, awayTeamBadge: game.awayTeamBadge, scheduledStart: game.scheduledStart }, game.homeTeam);
                                  }
                                }}
                                onPickAway={() => {
                                  if (isSelected && selectedPick === game.awayTeam) {
                                    removeGame(game.id);
                                  } else {
                                    if (isSelected) removeGame(game.id);
                                    addGame({ gameId: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, homeTeamBadge: game.homeTeamBadge, awayTeamBadge: game.awayTeamBadge, scheduledStart: game.scheduledStart }, game.awayTeam);
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
              </div>
            );
          })}
        </div>
      ) : isWorldCupOnly ? (
        /* ── World Cup: grouped by round with bettable/locked state ── */
        <div className="space-y-8">
          {Object.keys(wcGamesByRound)
            .map(Number)
            .sort((a, b) => a - b)
            .map((roundNum) => {
              const roundGames = wcGamesByRound[roundNum];
              const roundName = WC_ROUND_NAMES[roundNum] ?? `Round ${roundNum}`;
              // First game in this round — used to show when picks open
              const firstGame = roundGames[0];
              const windowOpens = new Date(firstGame.scheduledStart);
              windowOpens.setTime(windowOpens.getTime() - 7 * 24 * 60 * 60 * 1000);
              // A round is bettable if ANY of its games fall within the window
              const roundHasBettable = roundGames.some((g) => {
                const t = new Date(g.scheduledStart).getTime();
                return t >= windowStart.getTime() && t <= windowEnd.getTime();
              });
              const bettableCount = roundGames.filter((g) => {
                const t = new Date(g.scheduledStart).getTime();
                return t >= windowStart.getTime() && t <= windowEnd.getTime();
              }).length;

              return (
                <div key={roundNum}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-base font-bold text-white">{roundName}</h2>
                    <span className="text-brand-muted text-xs">
                      {roundGames.length} game{roundGames.length !== 1 ? "s" : ""}
                    </span>
                    {roundHasBettable ? (
                      <span className="text-xs bg-brand-green/20 text-brand-green border border-brand-green/30 rounded-full px-2 py-0.5">
                        {bettableCount} open for picks
                      </span>
                    ) : (
                      <span className="text-xs text-brand-muted border border-brand-border rounded-full px-2 py-0.5">
                        🔒 Picks not open yet
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {roundGames.map((game) => {
                      const gameTime = new Date(game.scheduledStart).getTime();
                      const isBettable =
                        gameTime >= windowStart.getTime() &&
                        gameTime <= windowEnd.getTime();
                      const isSelected = selectedGames.some(
                        (g) => g.gameId === game.id
                      );
                      const selectedPick = selectedGames.find(
                        (g) => g.gameId === game.id
                      )?.pickedTeam;
                      const atMax =
                        selectedCount >= MAX_PARLAY_GAMES && !isSelected;

                      return (
                        <GameRow
                          key={game.id}
                          game={game}
                          isSelected={isSelected}
                          selectedPick={selectedPick}
                          disabled={atMax}
                          bettable={isBettable}
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
      ) : (
        /* ── All other sports: existing layout grouped by sport ── */
        <div className="space-y-6">
          {Object.entries(gamesBySport).map(([sport, sportGames]) => {
            const config = LEAGUES[sport as LeagueKey];
            return (
              <div key={sport}>
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
                        bettable={true}
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
  bettable,
  isGolf = false,
  onPickHome,
  onPickAway,
}: {
  game: GameResponse;
  isSelected: boolean;
  selectedPick?: string;
  disabled: boolean;
  bettable: boolean;
  isGolf?: boolean;
  onPickHome: () => void;
  onPickAway: () => void;
}) {
  const gameDate = new Date(game.scheduledStart);
  const gameTime = gameDate.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // For locked games: show a short date like "Jun 11"
  const shortDate = gameDate.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  });

  if (!bettable) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-lg p-3 opacity-70">
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-brand-muted leading-tight text-center min-w-[60px] shrink-0">
            <div>{gameTime.split(",").slice(0, 2).join(",")}</div>
            <div>{gameTime.split(",").slice(2).join(",").trim()} ET</div>
          </div>
          <div className="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border border-brand-border text-brand-muted text-center">
            {game.homeTeam}
          </div>
          <span className="text-brand-muted text-xs font-medium">VS</span>
          <div className="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border border-brand-border text-brand-muted text-center">
            {game.awayTeam}
          </div>
          <div className="text-[11px] text-brand-muted text-center min-w-[44px] shrink-0">
            <div>🔒</div>
            <div>{shortDate}</div>
          </div>
        </div>
      </div>
    );
  }

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

        <span className="text-brand-muted text-xs font-medium">
          {isGolf ? "🏌" : "VS"}
        </span>

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
