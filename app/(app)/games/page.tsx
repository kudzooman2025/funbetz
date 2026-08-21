"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTicketStore } from "@/stores/ticket-store";
import { LEAGUES, LEAGUE_KEYS, MULTIPLIERS, type LeagueKey } from "@/lib/constants";
import { MIN_PARLAY_GAMES, MAX_PARLAY_GAMES } from "@/lib/constants";
import { formatKickoffSlot } from "@/lib/utils";
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

interface BettingWindow {
  start: string;
  end: string;
}

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

const ET = "America/New_York";

function shortDate(date: Date): string {
  return date
    .toLocaleString("en-US", { timeZone: ET, month: "short", day: "numeric" })
    .toUpperCase();
}

/** "AUG 21-23" across a week's games, spanning months when needed. */
function dateRange(games: GameResponse[]): string {
  const times = games
    .map((g) => new Date(g.scheduledStart).getTime())
    .sort((a, b) => a - b);
  if (times.length === 0) return "";
  const first = new Date(times[0]);
  const last = new Date(times[times.length - 1]);
  const month = (d: Date) =>
    d.toLocaleString("en-US", { timeZone: ET, month: "short" }).toUpperCase();
  const day = (d: Date) => d.toLocaleString("en-US", { timeZone: ET, day: "numeric" });
  if (month(first) === month(last)) {
    return day(first) === day(last)
      ? `${month(first)} ${day(first)}`
      : `${month(first)} ${day(first)}–${day(last)}`;
  }
  return `${month(first)} ${day(first)}–${month(last)} ${day(last)}`;
}

/**
 * Locked weeks open at the same weekly boundary that locks the current one,
 * so the next window's open day is the weekday of this window's end.
 */
function opensLabel(window: BettingWindow | null): string {
  if (!window) return "Locked";
  const day = new Date(window.end).toLocaleString("en-US", {
    timeZone: ET,
    weekday: "short",
  });
  return `Opens ${day}`;
}

export default function GamesPage() {
  return (
    <Suspense fallback={<GamesSkeleton />}>
      <GamesContent />
    </Suspense>
  );
}

function GamesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 bg-brand-surface rounded-[3px] animate-pulse w-48" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 bg-brand-surface rounded-[5px] animate-pulse" />
      ))}
    </div>
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
  const [bettingWindow, setBettingWindow] = useState<BettingWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showBrokePopup, setShowBrokePopup] = useState(false);
  // Weeks outside the betting window start collapsed so a full season stays
  // scannable; the user can open any of them.
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});
  // League chip strip: null means "all leagues".
  const [activeLeague, setActiveLeague] = useState<LeagueKey | null>(null);

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
        setBettingWindow(data.window ?? null);
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

  function pickHandlers(game: GameResponse) {
    const isSelected = selectedGames.some((g) => g.gameId === game.id);
    const selectedPick = selectedGames.find((g) => g.gameId === game.id)?.pickedTeam;
    const payload = {
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeTeamBadge: game.homeTeamBadge,
      awayTeamBadge: game.awayTeamBadge,
      scheduledStart: game.scheduledStart,
    };
    return {
      isSelected,
      selectedPick,
      onPickHome: () => {
        if (isSelected && selectedPick === game.homeTeam) {
          removeGame(game.id);
        } else {
          if (isSelected) removeGame(game.id);
          addGame(payload, game.homeTeam);
        }
      },
      onPickAway: () => {
        if (isSelected && selectedPick === game.awayTeam) {
          removeGame(game.id);
        } else {
          if (isSelected) removeGame(game.id);
          addGame(payload, game.awayTeam);
        }
      },
    };
  }

  // Group games by sport
  const gamesBySport: Record<string, GameResponse[]> = {};
  for (const game of games) {
    if (!gamesBySport[game.sport]) gamesBySport[game.sport] = [];
    gamesBySport[game.sport].push(game);
  }

  // League chips: only worth showing when more than one league is in play.
  const presentSports = Object.keys(gamesBySport) as LeagueKey[];
  const showChips = presentSports.length > 1;
  const visibleSports =
    activeLeague && gamesBySport[activeLeague] ? [activeLeague] : presentSports;

  // Sports with something bettable lead, so the page opens on what's open.
  const orderedSports = [...visibleSports].sort((a, b) => {
    const aOpen = gamesBySport[a].some((g) => g.bettable) ? 0 : 1;
    const bOpen = gamesBySport[b].some((g) => g.bettable) ? 0 : 1;
    return aOpen - bOpen;
  });

  // For golf: group by tournament (league) then round
  const golfByTournament: Record<
    string,
    { sport: LeagueKey; rounds: Record<number, GameResponse[]> }
  > = {};
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
    sportKeys.length === 0
      ? "All Leagues"
      : sportKeys.length === 1
        ? LEAGUES[sportKeys[0]].name
        : `${sportKeys.length} Leagues`;

  if (loading) return <GamesSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-[.03em] uppercase leading-none">
            {sportLabel}
          </h1>
          <p className="text-brand-muted text-xs mt-1.5">
            Select {MIN_PARLAY_GAMES}-{MAX_PARLAY_GAMES} games for your parlay
          </p>
        </div>
        <Link
          href="/dashboard"
          className="font-display text-[13px] tracking-[.1em] uppercase text-brand-muted hover:text-white transition-colors"
        >
          Change Sports
        </Link>
      </div>

      {error && (
        <div className="bg-brand-loss/10 border border-brand-loss/30 rounded-[4px] p-4 text-brand-loss mb-4">
          {error}
        </div>
      )}

      {showChips && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2.5 -mx-1 px-1">
          <LeagueChip
            label="All"
            active={activeLeague === null}
            onClick={() => setActiveLeague(null)}
          />
          {presentSports.map((sport) => (
            <LeagueChip
              key={sport}
              label={LEAGUES[sport]?.name || sport}
              active={activeLeague === sport}
              onClick={() => setActiveLeague(sport)}
            />
          ))}
        </div>
      )}

      {games.length === 0 && !error ? (
        <div className="bg-brand-card border border-brand-border rounded-[5px] p-8 text-center">
          <p className="text-brand-muted">No upcoming games available right now.</p>
          <p className="text-brand-muted text-sm mt-2">
            The full schedule appears here as soon as it&apos;s published.
          </p>
        </div>
      ) : isGolfOnly ? (
        /* Golf: grouped by tournament then round */
        <div className="space-y-10">
          {Object.entries(golfByTournament).map(([tournamentName, { sport, rounds }]) => {
            const roundNames = sport === "LIV" ? LIV_ROUND_NAMES : PGA_ROUND_NAMES;
            const sortedRounds = Object.keys(rounds)
              .map(Number)
              .sort((a, b) => a - b);
            return (
              <div key={tournamentName}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">⛳</span>
                  <div>
                    <h2 className="font-display font-bold text-[19px] tracking-[.04em] uppercase">
                      {tournamentName}
                    </h2>
                    <p className="text-[11px] text-brand-dim mt-0.5">
                      {sport === "LIV"
                        ? "LIV Golf · 54-hole individual stroke play"
                        : "PGA Tour · Round leader matchups"}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {sortedRounds.map((roundNum) => {
                    const roundGames = rounds[roundNum];
                    const label = roundNames[roundNum] ?? `Round ${roundNum}`;
                    return (
                      <div key={roundNum}>
                        <p className="font-display text-[13px] tracking-[.14em] uppercase text-brand-muted mb-2">
                          {label}
                        </p>
                        <div className="flex flex-col gap-2">
                          {roundGames.map((game) => {
                            const h = pickHandlers(game);
                            const atMax = selectedCount >= MAX_PARLAY_GAMES && !h.isSelected;
                            return game.bettable ? (
                              <GameRow
                                key={game.id}
                                game={game}
                                isSelected={h.isSelected}
                                selectedPick={h.selectedPick}
                                disabled={atMax}
                                onPickHome={h.onPickHome}
                                onPickAway={h.onPickAway}
                              />
                            ) : (
                              <LockedRow key={game.id} game={game} window={bettingWindow} />
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
        /* All other sports: full schedule grouped by league, then week */
        <div className="space-y-8">
          {orderedSports.map((sport) => {
            const sportGames = gamesBySport[sport];
            const config = LEAGUES[sport as LeagueKey];
            const byRound = groupByRound(sportGames);
            // Open weeks lead; locked weeks follow, each chronological.
            const roundKeys = Object.keys(byRound)
              .map(Number)
              .sort((a, b) => {
                const aOpen = byRound[a].some((g) => g.bettable) ? 0 : 1;
                const bOpen = byRound[b].some((g) => g.bettable) ? 0 : 1;
                if (aOpen !== bOpen) return aOpen - bOpen;
                return roundSortKey(a) - roundSortKey(b);
              });
            const showRoundHeaders = roundKeys.length > 1;

            return (
              <div key={sport}>
                {orderedSports.length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{config?.emoji}</span>
                    <h2 className="font-display font-bold text-[19px] tracking-[.04em] uppercase">
                      {config?.name || sport}
                    </h2>
                    <span className="font-mono text-[10px] text-brand-dim">
                      {sportGames.length} game{sportGames.length !== 1 ? "s" : ""}
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
                          <WeekHeader
                            title={roundLabel(sport as LeagueKey, roundNum)}
                            openCount={openCount}
                            range={dateRange(roundGames)}
                            expanded={isOpen}
                            onToggle={() =>
                              setExpandedRounds((prev) => ({ ...prev, [key]: !isOpen }))
                            }
                          />
                        )}

                        {(isOpen || !showRoundHeaders) && (
                          <div className="flex flex-col gap-2">
                            {roundGames.map((game) => {
                              const h = pickHandlers(game);
                              const atMax = selectedCount >= MAX_PARLAY_GAMES && !h.isSelected;
                              return game.bettable ? (
                                <GameRow
                                  key={game.id}
                                  game={game}
                                  isSelected={h.isSelected}
                                  selectedPick={h.selectedPick}
                                  disabled={atMax}
                                  onPickHome={h.onPickHome}
                                  onPickAway={h.onPickAway}
                                />
                              ) : (
                                <LockedRow key={game.id} game={game} window={bettingWindow} />
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

      {selectedCount > 0 && (
        <FloatingTicketBar
          count={selectedCount}
          canBuild={canBuild}
          isSignedIn={isSignedIn}
          authLoading={authStatus === "loading"}
          walletEmpty={walletBalance === 0}
          onBroke={() => setShowBrokePopup(true)}
        />
      )}

      {showBrokePopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-[5px] p-6 max-w-sm w-full text-center animate-rise">
            <div className="text-4xl mb-3">&#128176;</div>
            <h2 className="font-display font-bold text-[26px] tracking-[.03em] uppercase mb-1">
              Hold your horses!
            </h2>
            <p className="text-brand-muted mb-4 text-sm">You&apos;re outta betz!</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBrokePopup(false)}
                className="flex-1 min-h-[44px] border border-brand-line rounded-[3px] font-display text-[15px] tracking-[.1em] uppercase text-brand-muted hover:text-white transition-colors"
              >
                Close
              </button>
              <Link
                href="/wallet"
                className="flex-1 min-h-[44px] flex items-center justify-center bg-brand-green text-brand-black font-display font-bold text-[15px] tracking-[.1em] uppercase rounded-[3px] hover:brightness-110 transition-all"
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

function LeagueChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-none px-[11px] py-1.5 rounded-[3px] border font-display text-[14px] tracking-[.1em] uppercase whitespace-nowrap transition-colors ${
        active
          ? "border-brand-green bg-brand-green/14 text-brand-green"
          : "border-brand-line bg-brand-card text-brand-muted hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function WeekHeader({
  title,
  openCount,
  range,
  expanded,
  onToggle,
}: {
  title: string;
  openCount: number;
  range: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center gap-2 pt-2.5 pb-2 text-left">
      <svg
        viewBox="0 0 10 10"
        aria-hidden="true"
        className={`w-2.5 h-2.5 shrink-0 text-brand-dim transition-transform duration-150 ${
          expanded ? "rotate-90" : ""
        }`}
      >
        <path
          d="M3 1.5 L7 5 L3 8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`font-display font-bold text-[19px] tracking-[.04em] uppercase ${
          openCount > 0 ? "text-white" : "text-brand-muted"
        }`}
      >
        {title}
      </span>
      {openCount > 0 ? (
        <span className="px-[7px] py-[3px] rounded-[3px] bg-brand-green/14 border border-brand-green/35 text-brand-green font-display text-[12px] tracking-[.1em] uppercase">
          {openCount} open
        </span>
      ) : (
        <span className="px-[7px] py-[3px] rounded-[3px] border border-brand-line text-brand-dim font-display text-[12px] tracking-[.1em] uppercase">
          Locked
        </span>
      )}
      <span className="ml-auto font-mono text-[10px] text-brand-dim shrink-0">{range}</span>
    </button>
  );
}

/**
 * Team badge: prefers the remote badge URL, falls back to an initial-letter
 * avatar. Remote logos are inconsistent and often missing, so the fallback is
 * load-bearing rather than an edge case.
 */
function TeamBadge({
  name,
  badgeUrl,
  selected = false,
}: {
  name: string;
  badgeUrl: string | null;
  selected?: boolean;
}) {
  if (!badgeUrl) {
    return (
      <span
        className={`w-[26px] h-[26px] rounded-full bg-brand-surface border flex items-center justify-center font-display text-[13px] shrink-0 ${
          selected ? "border-[#3A4A2A] text-brand-green" : "border-brand-line text-brand-muted"
        }`}
      >
        {name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={badgeUrl}
      alt={name}
      className="w-[26px] h-[26px] rounded-full object-cover shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function PickButton({
  name,
  badgeUrl,
  picked,
  disabled,
  onClick,
}: {
  name: string;
  badgeUrl: string | null;
  picked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2.5 w-full min-h-[46px] py-2 px-2.5 text-left border-l-[3px] transition-colors ${
        picked
          ? "border-l-brand-green bg-brand-green/10 text-brand-green"
          : "border-l-brand-border bg-transparent text-[#C7D0D4] hover:bg-[#1C2226]"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <TeamBadge name={name} badgeUrl={badgeUrl} selected={picked} />
      <span className="font-display font-semibold text-[18px] tracking-[.03em] uppercase flex-1 min-w-0 truncate">
        {name}
      </span>
      {picked && (
        <span className="font-display text-[12px] tracking-[.14em] uppercase shrink-0">
          Picked
        </span>
      )}
      <span
        className={`w-4 h-4 rounded-[2px] shrink-0 ${
          picked ? "bg-brand-green" : "border border-[#3A4348]"
        }`}
      />
    </button>
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
  const start = new Date(game.scheduledStart);

  return (
    <div
      className={`border border-brand-border rounded-[5px] bg-brand-card overflow-hidden ${
        disabled && !isSelected ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between py-[7px] px-2.5 bg-brand-raised border-b border-brand-border">
        <span className="font-display text-[13px] tracking-[.12em] uppercase text-brand-muted">
          {formatKickoffSlot(start)}
        </span>
        <span className="font-mono text-[10px] text-brand-dim uppercase">{game.sport}</span>
      </div>
      <div className="flex flex-col">
        <PickButton
          name={game.awayTeam}
          badgeUrl={game.awayTeamBadge}
          picked={selectedPick === game.awayTeam}
          disabled={disabled && !isSelected}
          onClick={onPickAway}
        />
        <div className="h-px bg-brand-border mx-2.5" />
        <PickButton
          name={game.homeTeam}
          badgeUrl={game.homeTeamBadge}
          picked={selectedPick === game.homeTeam}
          disabled={disabled && !isSelected}
          onClick={onPickHome}
        />
      </div>
    </div>
  );
}

/**
 * Locked games stay visible on purpose: users browse the whole season, but can
 * only bet inside the current window.
 */
function LockedRow({ game, window }: { game: GameResponse; window: BettingWindow | null }) {
  const start = new Date(game.scheduledStart);
  return (
    <div className="flex items-center gap-2.5 p-2.5 border border-dashed border-brand-border rounded-[5px] bg-[#131719]">
      <span className="font-display text-[16px] tracking-[.03em] uppercase text-brand-dim flex-1 min-w-0 truncate">
        {game.awayTeam} at {game.homeTeam}
      </span>
      <span className="font-mono text-[10px] text-brand-faint shrink-0">{shortDate(start)}</span>
      <span className="font-display text-[12px] tracking-[.1em] uppercase text-brand-faint shrink-0">
        {opensLabel(window)}
      </span>
    </div>
  );
}

function FloatingTicketBar({
  count,
  canBuild,
  isSignedIn,
  authLoading,
  walletEmpty,
  onBroke,
}: {
  count: number;
  canBuild: boolean;
  isSignedIn: boolean;
  authLoading: boolean;
  walletEmpty: boolean;
  onBroke: () => void;
}) {
  const multiplier = MULTIPLIERS[count];
  const title = `${count} leg${count !== 1 ? "s" : ""}${multiplier ? ` · ${multiplier}x` : ""}`;
  const sub = canBuild
    ? `${multiplier}× your stake · up to ${MAX_PARLAY_GAMES} legs`
    : `need ${MIN_PARLAY_GAMES - count} more · min ${MIN_PARLAY_GAMES} legs`;

  const ctaClass =
    "min-h-[40px] flex items-center px-3.5 rounded-[3px] font-display font-bold text-[17px] tracking-[.1em] uppercase shrink-0";

  return (
    <div className="fixed bottom-16 md:bottom-4 left-2.5 right-2.5 md:left-auto md:right-4 md:w-96 flex items-center gap-2.5 py-2.5 px-3 bg-brand-raised border border-brand-green rounded-[5px] shadow-[0_10px_30px_rgba(0,0,0,.55)] z-40">
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-[18px] tracking-[.06em] uppercase text-brand-green">
          {title}
        </div>
        <div className="font-mono text-[10px] text-brand-muted mt-0.5 truncate">{sub}</div>
      </div>
      {canBuild && !isSignedIn && !authLoading ? (
        <Link href="/register" className={`${ctaClass} bg-brand-gold text-brand-black`}>
          Sign up to bet &rarr;
        </Link>
      ) : canBuild ? (
        walletEmpty ? (
          <button onClick={onBroke} className={`${ctaClass} bg-brand-green text-brand-black`}>
            Build ticket
          </button>
        ) : (
          <Link href="/ticket" className={`${ctaClass} bg-brand-green text-brand-black`}>
            Build ticket
          </Link>
        )
      ) : (
        <span className={`${ctaClass} bg-brand-surface text-brand-dim`}>Build ticket</span>
      )}
    </div>
  );
}
