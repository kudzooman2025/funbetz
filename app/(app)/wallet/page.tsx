"use client";

import { useEffect, useState } from "react";
import { REPLENISH_MIN, REPLENISH_MAX } from "@/lib/constants";

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [replenishAmount, setReplenishAmount] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/wallet")
      .then((res) => res.json())
      .then((data) => setBalance(data.balance))
      .catch(() => {});
  }, []);

  async function handleReplenish() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: replenishAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to replenish");
        return;
      }

      setBalance(data.balance);
      setSuccess(`Added ${replenishAmount} betz to your wallet!`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (balance === null) {
    return (
      <div className="max-w-md mx-auto">
        <div className="h-40 bg-brand-surface rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Wallet</h1>

      {/* Balance display */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-6 text-center mb-6">
        <div className="text-sm text-brand-muted mb-2">Current Balance</div>
        <div
          className={`text-5xl font-mono font-bold ${
            balance === 0 ? "text-red-400" : "text-brand-green"
          }`}
        >
          {balance.toLocaleString()}
        </div>
        <div className="text-sm text-brand-muted mt-1">betz</div>
      </div>

      {/* Replenish section */}
      {balance === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-lg p-6">
          <h2 className="font-semibold mb-3">Replenish Wallet</h2>
          <p className="text-brand-muted text-sm mb-4">
            Your wallet is empty. Add {REPLENISH_MIN}-{REPLENISH_MAX} betz to
            keep playing.
          </p>

          {/* Slider */}
          <div className="mb-4">
            <input
              type="range"
              min={REPLENISH_MIN}
              max={REPLENISH_MAX}
              step={100}
              value={replenishAmount}
              onChange={(e) => setReplenishAmount(Number(e.target.value))}
              className="w-full accent-brand-green"
            />
            <div className="flex justify-between text-xs text-brand-muted mt-1">
              <span>{REPLENISH_MIN}</span>
              <span className="font-mono text-white font-bold">
                {replenishAmount} betz
              </span>
              <span>{REPLENISH_MAX}</span>
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mb-4">
            {[100, 250, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => setReplenishAmount(amt)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  replenishAmount === amt
                    ? "bg-brand-green/20 border-brand-green text-brand-green"
                    : "border-brand-border text-brand-muted hover:text-white"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm mb-4">
              {success}
            </div>
          )}

          <button
            onClick={handleReplenish}
            disabled={loading}
            className="w-full bg-brand-green text-brand-dark font-bold py-3 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            {loading ? "Adding..." : `Add ${replenishAmount} Betz`}
          </button>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center text-sm text-brand-muted">
          Wallet replenish is available when your balance reaches 0.
        </div>
      )}
    </div>
  );
}
