"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTicketStore } from "@/stores/ticket-store";
import { MULTIPLIERS, MIN_PARLAY_GAMES } from "@/lib/constants";
import { formatGameTime } from "@/lib/utils";

export default function TicketPage() {
  const router = useRouter();
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
  const [success, setSuccess] = useState(false);

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

      setSuccess(true);
      clear();
      setTimeout(() => {
        router.push("/parlays");
      }, 1500);
    } catch {
      setError("Something went wrong");
    } finally {
      setPlacing(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-5xl mb-4">&#127881;</div>
        <h2 className="text-2xl font-bold text-brand-green mb-2">Bet Placed!</h2>
        <p className="text-brand-muted">Redirecting to your parlays...</p>
      </div>
    );
  }

  if (selectedGames.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h2 className="text-xl font-bold mb-2">No Games Selected</h2>
        <p className="text-brand-muted mb-4">
          Pick {MIN_PARLAY_GAMES}-8 games to build a parlay ticket.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-brand-green text-brand-dark font-bold px-6 py-2.5 rounded-lg hover:bg-green-400 transition-colors"
        >
          Select Games
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Parlay Ticket</h1>

      {/* Ticket Card */}
      <div className="ticket-border bg-brand-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-brand-muted uppercase tracking-widest">
            Parlay Ticket
          </div>
          <div className="text-xs text-brand-muted">
            {selectedGames.length} GAMES
          </div>
        </div>

        {/* Game picks */}
        <div className="space-y-2 mb-4">
          {selectedGames.map((game) => (
            <div
              key={game.gameId}
              className="flex items-center justify-between bg-brand-dark rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span
                    className={
                      game.pickedTeam === game.homeTeam
                        ? "text-brand-green font-medium"
                        : "text-gray-400"
                    }
                  >
                    {game.homeTeam}
                  </span>
                  <span className="text-brand-muted mx-1.5">vs</span>
                  <span
                    className={
                      game.pickedTeam === game.awayTeam
                        ? "text-brand-green font-medium"
                        : "text-gray-400"
                    }
                  >
                    {game.awayTeam}
                  </span>
                </div>
                <div className="text-xs text-brand-muted">
                  {formatGameTime(game.scheduledStart)}
                </div>
              </div>
              <button
                onClick={() => removeGame(game.gameId)}
                className="text-brand-muted hover:text-red-400 ml-2 p-1"
                title="Remove"
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>

        {/* Multiplier */}
        <div className="border-t border-dashed border-brand-border pt-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted">Multiplier</span>
            <span className="font-mono font-bold text-brand-gold">
              {multiplier > 0 ? `${multiplier}x` : "Select more games"}
            </span>
          </div>
        </div>
      </div>

      {/* Bet amount input */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Bet Amount
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBetAmount(betAmount - 10)}
            disabled={betAmount <= 10}
            className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm disabled:opacity-30"
          >
            -10
          </button>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            min={1}
            max={walletBalance}
            className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-2 text-center font-mono text-lg text-white"
          />
          <button
            onClick={() => setBetAmount(betAmount + 10)}
            disabled={betAmount + 10 > walletBalance}
            className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm disabled:opacity-30"
          >
            +10
          </button>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 mt-3">
          {[10, 50, 100, 250].map((amt) => (
            <button
              key={amt}
              onClick={() => setBetAmount(amt)}
              disabled={amt > walletBalance}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                betAmount === amt
                  ? "bg-brand-green/20 border-brand-green text-brand-green"
                  : "border-brand-border text-brand-muted hover:text-white disabled:opacity-30"
              }`}
            >
              {amt}
            </button>
          ))}
          <button
            onClick={() => setBetAmount(walletBalance)}
            disabled={walletBalance === 0}
            className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
              betAmount === walletBalance
                ? "bg-brand-green/20 border-brand-green text-brand-green"
                : "border-brand-border text-brand-muted hover:text-white disabled:opacity-30"
            }`}
          >
            ALL IN
          </button>
        </div>

        <div className="text-xs text-brand-muted mt-2 text-right">
          Wallet: {walletBalance.toLocaleString()} betz
        </div>
      </div>

      {/* Payout display */}
      {multiplier > 0 && (
        <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4 mb-4 text-center">
          <div className="text-sm text-brand-green mb-1">Potential Payout</div>
          <div className="text-3xl font-mono font-bold text-brand-green">
            {payout.toLocaleString()} betz
          </div>
          <div className="text-xs text-brand-muted mt-1">
            {betAmount} x {multiplier} = {payout}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex-1 py-3 text-center border border-brand-border rounded-lg text-brand-muted hover:text-white transition-colors"
        >
          Add Games
        </Link>
        <button
          onClick={handlePlaceBet}
          disabled={!canPlace}
          className="flex-1 bg-brand-green text-brand-dark font-bold py-3 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {placing ? "Placing..." : "Place Bet"}
        </button>
      </div>
    </div>
  );
}
