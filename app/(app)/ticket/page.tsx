"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTicketStore } from "@/stores/ticket-store";
import { MIN_PARLAY_GAMES, MAX_PARLAY_GAMES } from "@/lib/constants";
import { formatKickoffSlot } from "@/lib/utils";

const QUICK_AMOUNTS = [10, 50, 100, 250];

/**
 * A parlay resolves once its last game finishes, so the honest settle line
 * comes from the latest kickoff on the ticket — not a fixed day of the week.
 */
function settlesAfter(games: { scheduledStart: string }[]): string {
  if (games.length === 0) return "";
  const last = new Date(
    Math.max(...games.map((g) => new Date(g.scheduledStart).getTime()))
  );
  const day = last.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });
  return `settles ${day} night`;
}

interface PlacedSummary {
  payout: number;
  math: string;
  settles: string;
}

export default function TicketPage() {
  const {
    selectedGames,
    betAmount,
    setBetAmount,
    removeGame,
    getMultiplier,
    getPayout,
    clear,
  } = useTicketStore();

  const [walletBalance, setWalletBalance] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<PlacedSummary | null>(null);

  useEffect(() => {
    fetch("/api/wallet")
      .then((res) => res.json())
      .then((data) => setWalletBalance(data.balance))
      .catch(() => {});
  }, []);

  const multiplier = getMultiplier();
  const payout = getPayout();
  const canPlace =
    selectedGames.length >= MIN_PARLAY_GAMES &&
    betAmount >= 1 &&
    betAmount <= walletBalance &&
    !placing;

  async function handlePlaceBet() {
    if (!canPlace) return;
    setPlacing(true);
    setError("");

    // Captured before clear(), which empties the store the summary reads from.
    const summary: PlacedSummary = {
      payout,
      math: `${betAmount} × ${multiplier} = ${payout.toLocaleString()} betz`,
      settles: settlesAfter(selectedGames),
    };

    try {
      const res = await fetch("/api/parlays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          games: selectedGames.map((g) => ({
            gameId: g.gameId,
            pickedTeam: g.pickedTeam,
          })),
          betAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to place bet");
        return;
      }

      setPlaced(summary);
      clear();
    } catch {
      setError("Something went wrong");
    } finally {
      setPlacing(false);
    }
  }

  /* ── Confirmation ─────────────────────────────────────────────────────── */
  if (placed) {
    return (
      <div className="max-w-lg mx-auto py-10 px-2 text-center animate-rise">
        <div className="inline-flex items-center gap-2 py-1.5 px-3 border border-brand-green rounded-[3px] text-brand-green font-display text-[14px] tracking-[.2em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-led" />
          Ticket live
        </div>
        <h1 className="font-display font-bold text-[40px] leading-[1.05] tracking-[.04em] uppercase mt-[18px]">
          You&apos;re on the board
        </h1>
        <p className="font-mono text-[12px] text-brand-muted mt-1.5">
          {placed.math} · {placed.settles}
        </p>
        <div className="mt-[22px] flex flex-col items-center gap-3">
          <Link
            href="/leagues"
            className="min-h-[44px] flex items-center px-[18px] border border-brand-line bg-brand-surface rounded-[4px] font-display text-[17px] tracking-[.1em] uppercase hover:border-brand-muted transition-colors"
          >
            See the league board
          </Link>
          <Link
            href="/parlays"
            className="font-display text-[14px] tracking-[.1em] uppercase text-brand-dim hover:text-brand-muted transition-colors"
          >
            View my parlays
          </Link>
        </div>
      </div>
    );
  }

  /* ── Empty ────────────────────────────────────────────────────────────── */
  if (selectedGames.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="font-display font-bold text-[26px] tracking-[.03em] uppercase">
          No games selected
        </h1>
        <p className="text-brand-muted text-sm mt-2 mb-5">
          Pick {MIN_PARLAY_GAMES}–{MAX_PARLAY_GAMES} games to build a parlay ticket.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center min-h-[44px] px-5 bg-brand-green text-brand-black font-display font-bold text-[17px] tracking-[.1em] uppercase rounded-[4px] hover:brightness-110 transition-all"
        >
          Select games
        </Link>
      </div>
    );
  }

  /* ── Ticket ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-brand-card border border-brand-border rounded-[5px] overflow-hidden">
        <div className="flex items-center justify-between py-2.5 px-3 bg-brand-black border-b border-brand-border">
          <span className="font-display font-bold text-[17px] tracking-[.14em] uppercase">
            Parlay ticket
          </span>
          <span className="font-mono text-[11px] text-brand-muted">
            {selectedGames.length} LEGS
          </span>
        </div>

        <div className="flex flex-col">
          {selectedGames.map((game, i) => {
            const opponent =
              game.pickedTeam === game.homeTeam ? game.awayTeam : game.homeTeam;
            return (
              <div
                key={game.gameId}
                className="flex items-center gap-2.5 py-2.5 px-3 border-b border-[#1D2326] animate-leg-in"
              >
                <span className="font-mono text-[10px] text-brand-faint w-3.5 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-[17px] tracking-[.03em] uppercase text-brand-green truncate">
                    {game.pickedTeam}
                  </div>
                  <div className="font-mono text-[10px] text-brand-dim mt-0.5 truncate">
                    to beat {opponent} · {formatKickoffSlot(game.scheduledStart)}
                  </div>
                </div>
                <button
                  onClick={() => removeGame(game.gameId)}
                  title={`Remove ${game.pickedTeam}`}
                  className="w-6 h-6 shrink-0 flex items-center justify-center border border-brand-line bg-brand-surface text-brand-muted rounded-[3px] text-xs leading-none hover:text-brand-loss hover:border-brand-loss/50 transition-colors"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between py-[11px] px-3 border-t border-dashed border-brand-line">
          <span className="font-display text-[14px] tracking-[.14em] uppercase text-brand-muted">
            Multiplier
          </span>
          <span className="font-mono font-semibold text-[20px] text-brand-gold">
            {multiplier > 0 ? `${multiplier}x` : "—"}
          </span>
        </div>
      </div>

      {/* Stake */}
      <div className="mt-3 bg-brand-card border border-brand-border rounded-[5px] p-3">
        <div className="font-display text-[14px] tracking-[.14em] uppercase text-brand-muted mb-2.5">
          Stake
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBetAmount(betAmount - 10)}
            disabled={betAmount <= 10}
            className="w-11 h-11 shrink-0 border border-brand-line bg-brand-surface rounded-[4px] font-mono text-[14px] disabled:opacity-30 hover:border-brand-muted transition-colors"
          >
            −10
          </button>
          <div className="flex-1 bg-brand-black border border-brand-line rounded-[4px] pt-1.5 pb-[5px] text-center">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={1}
              max={walletBalance}
              aria-label="Stake in betz"
              className="w-full bg-transparent border-0 text-center font-mono font-semibold text-[26px] leading-none text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="font-display text-[11px] tracking-[.16em] uppercase text-brand-dim mt-[3px]">
              betz
            </div>
          </div>
          <button
            onClick={() => setBetAmount(betAmount + 10)}
            disabled={betAmount + 10 > walletBalance}
            className="w-11 h-11 shrink-0 border border-brand-line bg-brand-surface rounded-[4px] font-mono text-[14px] disabled:opacity-30 hover:border-brand-muted transition-colors"
          >
            +10
          </button>
        </div>

        <div className="flex gap-1.5 mt-2.5">
          {QUICK_AMOUNTS.map((amt) => (
            <QuickAmount
              key={amt}
              label={String(amt)}
              active={betAmount === amt}
              disabled={amt > walletBalance}
              onClick={() => setBetAmount(amt)}
            />
          ))}
          <QuickAmount
            label="All"
            active={betAmount === walletBalance && walletBalance > 0}
            disabled={walletBalance === 0}
            onClick={() => setBetAmount(walletBalance)}
          />
        </div>

        <div className="font-mono text-[10px] text-brand-dim mt-2 text-right">
          wallet {walletBalance.toLocaleString()} betz
        </div>
      </div>

      {/* Payout */}
      {multiplier > 0 && (
        <div className="mt-3 bg-brand-black border border-brand-gold/35 rounded-[5px] p-3.5 text-center">
          <div className="font-display text-[13px] tracking-[.2em] uppercase text-brand-gold">
            To win
          </div>
          <div className="font-mono font-semibold text-[44px] leading-[1.05] tracking-[-.02em] text-brand-gold">
            {payout.toLocaleString()}
          </div>
          <div className="font-mono text-[11px] text-brand-dim mt-1">
            {betAmount} × {multiplier} = {payout.toLocaleString()} betz
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-brand-loss/10 border border-brand-loss/30 rounded-[4px] p-3 text-brand-loss text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePlaceBet}
        disabled={!canPlace}
        className={`mt-3 w-full min-h-[50px] rounded-[4px] font-display font-bold text-[20px] tracking-[.12em] uppercase transition-all ${
          canPlace
            ? "bg-brand-green text-brand-black hover:brightness-110"
            : "bg-brand-surface text-brand-dim cursor-not-allowed"
        }`}
      >
        {placing ? "Placing…" : "Place bet · lock it in"}
      </button>

      <div className="text-center mt-3">
        <Link
          href="/dashboard"
          className="font-display text-[15px] tracking-[.1em] uppercase text-brand-dim hover:text-brand-muted transition-colors"
        >
          Add games
        </Link>
      </div>
    </div>
  );
}

function QuickAmount({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 min-h-[34px] rounded-[3px] border font-display text-[14px] tracking-[.1em] uppercase transition-colors disabled:opacity-30 ${
        active
          ? "border-brand-green bg-brand-green/14 text-brand-green"
          : "border-brand-line bg-brand-surface text-brand-muted hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
