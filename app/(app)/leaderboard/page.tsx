"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => setEntries(data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-8 bg-brand-surface rounded animate-pulse w-48 mb-4" />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 bg-brand-surface rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      {entries.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-lg p-8 text-center">
          <p className="text-brand-muted">
            No scores yet. Be the first to place a bet!
          </p>
        </div>
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-3 text-xs uppercase tracking-wider text-brand-muted border-b border-brand-border">
            <div className="col-span-2">Rank</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-4 text-right">Score</div>
          </div>

          {/* Rows */}
          {entries.map((entry) => {
            const isCurrentUser =
              session?.user?.username === entry.username;
            const rankDisplay =
              entry.rank === 1
                ? "&#129351;"
                : entry.rank === 2
                ? "&#129352;"
                : entry.rank === 3
                ? "&#129353;"
                : `#${entry.rank}`;

            return (
              <div
                key={entry.rank}
                className={`grid grid-cols-12 px-4 py-3 items-center border-b border-brand-border last:border-b-0 ${
                  isCurrentUser ? "bg-brand-green/5" : ""
                }`}
              >
                <div
                  className="col-span-2 font-mono text-sm"
                  dangerouslySetInnerHTML={{ __html: rankDisplay }}
                />
                <div className="col-span-6 text-sm">
                  <span className={isCurrentUser ? "text-brand-green font-medium" : ""}>
                    {entry.username}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-brand-green ml-1">(you)</span>
                  )}
                </div>
                <div
                  className={`col-span-4 text-right font-mono text-sm font-medium ${
                    entry.score > 0
                      ? "text-green-400"
                      : entry.score < 0
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {entry.score > 0 ? "+" : ""}
                  {entry.score.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
