"use client";

/**
 * League "Cards" tab — everyone's parlay cards for the league window.
 *
 * Sharing is opt-in per person, so this also hosts the toggle that turns a
 * member's own cards on or off for their league-mates.
 */

import { useCallback, useEffect, useState } from "react";

interface Leg {
  id: string;
  homeTeam: string;
  awayTeam: string;
  scheduledStart: string;
  homeScore: number | null;
  awayScore: number | null;
  gameStatus: string;
  pickedTeam: string | null;
  result: string | null;
  hidden: boolean;
}

interface Card {
  id: string;
  username: string;
  isOwn: boolean;
  betAmount: number;
  numGames: number;
  multiplier: number;
  potentialPayout: number;
  status: string;
  createdAt: string;
  payout: number | null;
  netChange: number | null;
  legs: Leg[];
  anyHidden: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  WON: "bg-brand-green/15 text-brand-green border-brand-green/30",
  LOST: "bg-red-500/15 text-red-400 border-red-500/30",
  CANCELLED: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function legMark(leg: Leg) {
  if (leg.result === "WON") return "✅";
  if (leg.result === "LOST") return "❌";
  if (leg.result === "PUSH") return "➖";
  return "•";
}

export function LeagueCards({ leagueId }: { leagueId: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [sharingCount, setSharingCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${leagueId}/parlays`);
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards ?? []);
        setSharing(Boolean(data.youAreSharing));
        setSharingCount(data.sharingCount ?? 0);
        setMemberCount(data.memberCount ?? 0);
      }
    } catch {
      // Leave the empty state in place.
    }
    setLoading(false);
  }, [leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleSharing() {
    const next = !sharing;
    setSavingShare(true);
    setSharing(next); // optimistic
    try {
      const res = await fetch("/api/user/share-parlays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareParlays: next }),
      });
      if (!res.ok) setSharing(!next);
      else await load();
    } catch {
      setSharing(!next);
    }
    setSavingShare(false);
  }

  if (loading) {
    return <p className="text-brand-muted text-sm py-6 text-center">Loading cards…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Sharing control */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-white font-semibold text-sm">Share my cards</p>
          <p className="text-brand-muted text-xs mt-0.5">
            {sharing
              ? "Your league-mates can see your parlays. Picks stay hidden until each game starts."
              : "Your parlays are private. Turn this on to let your league see them."}
          </p>
          <p className="text-brand-muted text-xs mt-1">
            {sharingCount} of {memberCount} member{memberCount !== 1 ? "s" : ""} sharing
          </p>
        </div>
        <button
          onClick={toggleSharing}
          disabled={savingShare}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
            sharing
              ? "bg-brand-green text-brand-dark hover:bg-green-400"
              : "bg-brand-surface border border-brand-border text-gray-300 hover:border-gray-500"
          }`}
        >
          {sharing ? "Sharing" : "Share"}
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">🎟️</p>
          <p className="text-white font-semibold">No cards yet</p>
          <p className="text-brand-muted text-sm">
            Parlays placed during the league show up here.
          </p>
        </div>
      ) : (
        cards.map((card) => {
          const isOpen = expanded[card.id] ?? false;
          const badge = STATUS_STYLES[card.status] ?? STATUS_STYLES.CANCELLED;

          return (
            <div
              key={card.id}
              className="bg-brand-card border border-brand-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpanded((p) => ({ ...p, [card.id]: !isOpen }))}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                      {card.username.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold text-white truncate">
                      {card.username}
                      {card.isOwn && <span className="text-brand-muted font-normal"> (you)</span>}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badge}`}>
                      {card.status}
                    </span>
                  </div>
                  <span className="text-brand-muted text-xs shrink-0">
                    {isOpen ? "▾" : "▸"}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-brand-muted">
                    {card.numGames}-leg &middot; {card.multiplier}x
                  </span>
                  <span className="text-brand-muted">Bet {card.betAmount}</span>
                  {card.status === "PENDING" ? (
                    <span className="text-brand-gold">To win {card.potentialPayout}</span>
                  ) : card.netChange !== null ? (
                    <span className={card.netChange >= 0 ? "text-brand-green" : "text-red-400"}>
                      {card.netChange >= 0 ? "+" : ""}
                      {card.netChange}
                    </span>
                  ) : null}
                  {card.anyHidden && (
                    <span className="text-brand-muted">🔒 picks hidden until kickoff</span>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-brand-border divide-y divide-brand-border/50">
                  {card.legs.map((leg) => (
                    <div key={leg.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span className="w-4 shrink-0">{legMark(leg)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-gray-300 truncate">
                          {leg.homeTeam} <span className="text-brand-muted">vs</span> {leg.awayTeam}
                        </div>
                        <div className="text-xs mt-0.5">
                          {leg.hidden ? (
                            <span className="text-brand-muted">Pick hidden until kickoff</span>
                          ) : (
                            <span className="text-brand-green font-medium">{leg.pickedTeam}</span>
                          )}
                          {leg.homeScore !== null && leg.awayScore !== null && (
                            <span className="text-brand-muted ml-2">
                              {leg.homeScore}&ndash;{leg.awayScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
