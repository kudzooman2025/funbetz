"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTicketStore } from "@/stores/ticket-store";
import { LEAGUES, LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";
import { MIN_PARLAY_GAMES, MAX_PARLAY_GAMES, GAME_BUFFER_HOURS } from "@/lib/constants";
import type { GameResponse } from "@/lib/types";

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

// Round-number bands, mirroring the offsets in lib/espn-source.
const POSTSEASON_ROUND = 100;
const PRESEASON_ROUND = 500;

// ESPN files the NFL postseason as weeks 1-5 under its own season type.
const NFL_POSTSEASON_LABELS = [
  "Wild Card",
  "Divisional Round",
  "Conference Championships",
  "Pro Bowl",
  "Super Bowl",
];

function roundLabel(sport: LeagueKey, round: number): string {
  if (round >= PRESEASON_ROUND) {
    const week = round - PRESEASON_ROUND;
    return week > 0 ? `Preseason Week ${week}` : "Preseason";
  }
  if (round >= POSTSEASON_ROUND) {
    if (sport === "NCAAF") return "Bowls & Playoff";
    return NFL_POSTSEASON_LABELS[round - POSTSEASON_ROUND - 1] ?? "Playoffs";
  }
  if (sport === "EPL") return `Matchweek ${round}`;
  return `Week ${round}`;
}

/**
 * Round numbers are banded (preseason 500+, postseason 100+), which is not
 * chronological. Sort so the season reads in the order it is played:
 * preseason, then regular season, then postseason.
 */
function roundSortKey(round: number): number {
  if (round >= PRESEASON_ROUND) return round - PRESEASON_ROUND - 1000;
  return round;
}

function groupByRound(games: GameResponse[]): Record<number, GameResponse[]> {
  const byRound: Record<number, GameResponse[]> = {};
  for (const game of games) {
    const r = game.round ?? 0;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(game);
  }
  return byRound;
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
  const { data: session, status: authStatus } = useSession();
  const isSignedIn = Boolean(session?.user);
  const sportsParam = searchParams.get("sports")?.toUpperCase() || "";
  const sportKeys = sportsParam
    .split(",")
    .filter((s) => LEAGUE_KEYS.includes(s as LeagueKey)) as LeagueKey[];

  const isGolfOnly = sportKeys.length > 0 && sportKeys.every((k) => GOLF_SPORTS.has(k));

  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showBrokePopup, setShowBrokePopup] = useState(false);
  // Weeks outside the betting window start collapsed so a full season stays
  // scannable; the user can open any of them.
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

  const { selectedGames, addGame, removeGame } = useTicketStore();

  useEffect(() => {
    async function fetchGames() {
      try {
        const params = new URLSearchParams();
        if (sportKeys.length > 0) params.set("sport", sportKeys.join(","));
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
    if (isSignedIn) {
      fetch("/api/wallet")
        .then((res) => res.json())
        .then((data) => setWalletBalance(data.balance))
        .catch(() => {});
    }
  }, [sportsParam, isSignedIn]);

  const selectedCount = selectedGames.length;
  const canBuild = selectedCount >= MIN_PARLAY_GAMES;

  // Group games by sport
  const gamesBySport: Record<string, GameResponse[]> = {};
  for (const game of games) {
    if (!gamesBySport[game.sport]) gamesBySport[game.sport] = [];
    gamesBySport[game.sport].push(game);
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
            The full schedule appears here as soon as it&apos;s published.
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
                                bettable={game.bettable}
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
      ) : (
        /* ── All other sports: full schedule grouped by league, then week ── */
        <div className="space-y-8">
          {Object.entries(gamesBySport).map(([sport, sportGames]) => {
            const config = LEAGUES[sport as LeagueKey];
            const byRound = groupByRound(sportGames);
            const roundKeys = Object.keys(byRound)
              .map(Number)
              .sort((a, b) => roundSortKey(a) - roundSortKey(b));
            const showRoundHeaders = roundKeys.length > 1;

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

                <div className="space-y-4">
                  {roundKeys.map((roundNum) => {
                    const roundGames = byRound[roundNum];
                    const openCount = roundGames.filter((g) => g.bettable).length;
                    const key = `${sport}-${roundNum}`;
                    // Open weeks expand by default; locked weeks collapse.
                    const isOpen = expandedRounds[key] ?? openCount > 0;

                    return (
                      <div key={roundNum}>
                        {showRoundHeaders && (
                          <button
                            onClick={() =>
                              setExpandedRounds((prev) => ({ ...prev, [key]: !isOpen }))
                            }
                            className="w-full flex items-center gap-3 mb-2 text-left"
                          >
                            <span className="text-brand-muted text-[11px] font-semibold w-16 shrink-0">
                              {isOpen ? "\u25BE Collapse" : "\u25B8 Expand"}
                            </span>
                            <h3 className="text-sm font-bold text-white">
                              {roundLabel(sport as LeagueKey, roundNum)}
                            </h3>
                            <span className="text-brand-muted text-xs">
                              {roundGames.length} game{roundGames.length !== 1 ? "s" : ""}
                            </span>
                            {openCount > 0 ? (
                              <span className="text-xs bg-brand-green/20 text-brand-green border border-brand-green/30 rounded-full px-2 py-0.5">
                                {openCount} open for picks
                              </span>
                            ) : (
                              <span className="text-xs text-brand-muted border border-brand-border rounded-full px-2 py-0.5">
                                &#128274; Picks not open yet
                              </span>
                            )}
                          </button>
                        )}

                        {(isOpen || !showRoundHeaders) && (
                          <div className="space-y-2">
                            {roundGames.map((game) => {
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
                                  bettable={game.bettable}
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
                        )}
                      </div>
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
            {canBuild && !isSignedIn && authStatus !== "loading" ? (
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg font-bold text-sm bg-brand-gold text-brand-dark hover:bg-yellow-300 transition-colors"
              >
                Sign up to bet &rarr;
              </Link>
            ) : canBuild ? (
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

/**
 * Small team badge: prefers the TheSportsDB badge URL, falls back to a local
 * logo from /public/logos/ (for MLS NEXT teams), then to an initial-letter
 * avatar. Uses a plain <img> so no next/image remote-domain config is needed.
 */
function TeamBadge({
  name,
  badgeUrl,
  muted = false,
}: {
  name: string;
  badgeUrl: string | null;
  muted?: boolean;
}) {
  const src = badgeUrl;

  if (!src) {
    return (
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 border ${
          muted
            ? "bg-brand-surface border-brand-border text-brand-muted"
            : "bg-brand-surface border-brand-border text-gray-400"
        }`}
      >
        {name.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={`w-6 h-6 rounded-full object-cover flex-shrink-0 ${muted ? "opacity-50" : ""}`}
      onError={(e) => {
        // Hide broken images gracefully; the button text still identifies the team
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
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
          <div className="flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border border-brand-border text-brand-muted">
            <TeamBadge name={game.homeTeam} badgeUrl={game.homeTeamBadge} muted />
            <span className="truncate">{game.homeTeam}</span>
          </div>
          <span className="text-brand-muted text-xs font-medium shrink-0">VS</span>
          <div className="flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border border-brand-border text-brand-muted">
            <TeamBadge name={game.awayTeam} badgeUrl={game.awayTeamBadge} muted />
            <span className="truncate">{game.awayTeam}</span>
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
          className={`flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
            selectedPick === game.homeTeam
              ? "bg-brand-green/20 border-brand-green text-brand-green"
              : "border-brand-border text-gray-300 hover:border-gray-500"
          } ${disabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <TeamBadge name={game.homeTeam} badgeUrl={game.homeTeamBadge} />
          <span className="truncate">{game.homeTeam}</span>
        </button>

        <span className="text-brand-muted text-xs font-medium shrink-0">
          {isGolf ? "⛳" : "VS"}
        </span>

        {/* Away team pick */}
        <button
          onClick={onPickAway}
          disabled={disabled && !isSelected}
          className={`flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
            selectedPick === game.awayTeam
              ? "bg-brand-green/20 border-brand-green text-brand-green"
              : "border-brand-border text-gray-300 hover:border-gray-500"
          } ${disabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <TeamBadge name={game.awayTeam} badgeUrl={game.awayTeamBadge} />
          <span className="truncate">{game.awayTeam}</span>
        </button>
      </div>
    </div>
  );
}
