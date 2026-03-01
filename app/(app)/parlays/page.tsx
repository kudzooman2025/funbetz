"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ParlayResponse } from "@/lib/types";
import { formatGameTime } from "@/lib/utils";

export default function ParlaysPage() {
  const [parlays, setParlays] = useState<ParlayResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");

  useEffect(() => {
    fetch("/api/parlays")
      .then((res) => res.json())
      .then((data) => setParlays(data.parlays))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeParlays = parlays.filter((p) => p.status === "PENDING");
  const historyParlays = parlays.filter((p) => p.status !== "PENDING");
  const displayParlays = tab === "active" ? activeParlays : historyParlays;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-brand-surface rounded animate-pulse w-48" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-brand-surface rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Parlays</h1>
        <Link
          href="/dashboard"
          className="bg-brand-green text-brand-dark font-bold text-sm px-4 py-2 rounded-lg hover:bg-green-400 transition-colors"
        >
          New Parlay
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-surface rounded-lg p-1 mb-6">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "active"
              ? "bg-brand-card text-white"
              : "text-brand-muted hover:text-white"
          }`}
        >
          Active ({activeParlays.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "history"
              ? "bg-brand-card text-white"
              : "text-brand-muted hover:text-white"
          }`}
        >
          History ({historyParlays.length})
        </button>
      </div>

      {/* Parlay List */}
      {displayParlays.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-lg p-8 text-center">
          <p className="text-brand-muted">
            {tab === "active"
              ? "No active parlays. Place a bet to get started!"
              : "No completed parlays yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayParlays.map((parlay) => (
            <ParlayCard key={parlay.id} parlay={parlay} />
          ))}
        </div>
      )}
    </div>
  );
}

function ParlayCard({ parlay }: { parlay: ParlayResponse }) {
  const statusColors = {
    PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    WON: "bg-green-500/10 text-green-400 border-green-500/30",
    LOST: "bg-red-500/10 text-red-400 border-red-500/30",
    CANCELLED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  };

  return (
    <div className="ticket-border bg-brand-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded border ${
              statusColors[parlay.status as keyof typeof statusColors]
            }`}
          >
            {parlay.status}
          </span>
          <span className="text-xs text-brand-muted">
            {parlay.numGames}-game parlay
          </span>
        </div>
        <span className="font-mono text-brand-gold text-sm font-bold">
          {parlay.multiplier}x
        </span>
      </div>

      {/* Game picks */}
      <div className="space-y-1.5 mb-3">
        {parlay.games.map((game) => {
          const resultIcon =
            game.result === "WON"
              ? "&#10003;"
              : game.result === "LOST"
              ? "&#10007;"
              : "&#9711;";
          const resultColor =
            game.result === "WON"
              ? "text-green-400"
              : game.result === "LOST"
              ? "text-red-400"
              : "text-brand-muted";

          return (
            <div
              key={game.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={resultColor}
                  dangerouslySetInnerHTML={{ __html: resultIcon }}
                />
                <span className="truncate">
                  <span
                    className={
                      game.pickedTeam === game.homeTeam
                        ? "text-white font-medium"
                        : "text-gray-500"
                    }
                  >
                    {game.homeTeam}
                  </span>
                  <span className="text-brand-muted mx-1">vs</span>
                  <span
                    className={
                      game.pickedTeam === game.awayTeam
                        ? "text-white font-medium"
                        : "text-gray-500"
                    }
                  >
                    {game.awayTeam}
                  </span>
                </span>
              </div>
              {game.homeScore !== null && game.awayScore !== null && (
                <span className="font-mono text-xs text-brand-muted ml-2">
                  {game.homeScore}-{game.awayScore}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-dashed border-brand-border pt-3 flex justify-between items-center">
        <div className="text-sm">
          <span className="text-brand-muted">Bet: </span>
          <span className="font-mono">{parlay.betAmount}</span>
        </div>
        <div className="text-sm">
          {parlay.status === "WON" ? (
            <span className="text-green-400 font-bold font-mono">
              Won {parlay.result?.payoutAmount.toLocaleString()} betz
            </span>
          ) : parlay.status === "LOST" ? (
            <span className="text-red-400 font-mono">
              Lost {parlay.betAmount} betz
            </span>
          ) : (
            <span className="text-brand-gold font-mono">
              To win: {parlay.potentialPayout.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Check back message for pending parlays */}
      {parlay.status === "PENDING" && (() => {
        const latestGame = parlay.games.reduce((latest, g) =>
          new Date(g.scheduledStart) > new Date(latest.scheduledStart) ? g : latest
        );
        // Estimate result time: last game start + 3 hours for game duration + 4 hours resolve buffer
        const estimatedTime = new Date(
          new Date(latestGame.scheduledStart).getTime() + 4 * 60 * 60 * 1000
        );
        const timeStr = estimatedTime.toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const dateStr = estimatedTime.toLocaleString("en-US", {
          timeZone: "America/New_York",
          month: "short",
          day: "numeric",
        });
        return (
          <p className="text-sm text-brand-gold font-bold mt-2">
            Check back at {timeStr} on {dateStr} to see if you won!
          </p>
        );
      })()}

      <div className="text-xs text-brand-muted mt-2">
        {formatGameTime(parlay.createdAt)}
      </div>
    </div>
  );
}
