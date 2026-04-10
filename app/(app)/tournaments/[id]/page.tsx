"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { TournamentDetail, TournamentLeaderboardEntry } from "@/lib/types";
import { LEAGUES } from "@/lib/constants";

type Tab = "leaderboard" | "members" | "info";

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (!res.ok) {
        router.push("/tournaments");
        return;
      }
      const data = await res.json();
      setTournament(data.tournament);
    } catch {
      router.push("/tournaments");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/leaderboard`);
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
    } catch {
      /* silently fail */
    } finally {
      setLbLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    if (tab === "leaderboard") loadLeaderboard();
  }, [tab, loadLeaderboard]);

  function copyInviteCode() {
    if (!tournament) return;
    navigator.clipboard.writeText(tournament.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function removeMember(userId: string, username: string) {
    if (!confirm(`Remove ${username} from this tournament?`)) return;
    setActionError("");
    const res = await fetch(`/api/tournaments/${id}/members/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error ?? "Failed to remove member.");
    } else {
      setTournament((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.userId !== userId), memberCount: prev.memberCount - 1 } : prev
      );
    }
  }

  async function leaveTournament() {
    if (!confirm("Leave this tournament?")) return;
    setActionError("");
    const res = await fetch(`/api/tournaments/${id}/leave`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error ?? "Failed to leave tournament.");
    } else {
      router.push("/tournaments");
    }
  }

  async function cancelTournament() {
    if (!confirm("Cancel this tournament? This cannot be undone.")) return;
    setActionError("");
    const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error ?? "Failed to cancel tournament.");
    } else {
      router.push("/tournaments");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-brand-surface rounded animate-pulse w-64 mb-4" />
        <div className="h-32 bg-brand-surface rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!tournament) return null;

  const now = new Date();
  const start = new Date(tournament.startDate);
  const end = new Date(tournament.endDate);
  const isActive = tournament.status === "ACTIVE";
  const isLive = isActive && now >= start && now <= end;
  const isUpcoming = isActive && now < start;

  const statusLabel = tournament.status === "CANCELLED" ? "Cancelled" : isUpcoming ? "Upcoming" : isLive ? "Live" : "Ended";
  const statusColor = isLive ? "text-brand-green" : "text-brand-muted";

  const sportLabels = tournament.sports
    .map((s) => {
      const l = LEAGUES[s as keyof typeof LEAGUES];
      return l ? `${l.emoji} ${l.name}` : s;
    });

  const isCreator = tournament.isCreator;
  const userId = session?.user?.id;

  return (
    <div>
      {/* Back link */}
      <Link href="/tournaments" className="text-brand-muted hover:text-white text-sm transition-colors">
        ← Tournaments
      </Link>

      {/* Header */}
      <div className="mt-4 mb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-brand-muted text-sm mt-1">{tournament.description}</p>
            )}
          </div>
          <span className={`text-sm font-medium ${statusColor} shrink-0 mt-1`}>
            ● {statusLabel}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-muted">
          <span>
            {new Date(tournament.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" – "}
            {new Date(tournament.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span>{tournament.memberCount} {tournament.memberCount === 1 ? "member" : "members"}</span>
        </div>

        {/* Sports chips */}
        {sportLabels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sportLabels.map((label) => (
              <span key={label} className="text-xs bg-brand-surface border border-brand-border rounded-full px-3 py-1">
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Invite code */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-brand-muted">Invite code:</span>
          <button
            onClick={copyInviteCode}
            className="font-mono text-sm bg-brand-surface border border-brand-border rounded px-2.5 py-1 hover:border-brand-green/40 transition-colors"
          >
            {tournament.inviteCode}
          </button>
          <button
            onClick={copyInviteCode}
            className="text-xs text-brand-muted hover:text-white transition-colors"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {actionError && (
        <p className="text-red-400 text-sm mb-4">{actionError}</p>
      )}

      {/* Tabs */}
      <div className="flex border-b border-brand-border mb-5 gap-0">
        {(["leaderboard", "members", "info"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-brand-green text-brand-green"
                : "border-transparent text-brand-muted hover:text-white"
            }`}
          >
            {t === "members" ? `Members (${tournament.memberCount})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Leaderboard tab */}
      {tab === "leaderboard" && (
        <div>
          {lbLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-brand-surface rounded-lg animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-brand-card border border-brand-border rounded-lg p-8 text-center">
              <p className="text-brand-muted text-sm">No scores yet — place your first parlay!</p>
            </div>
          ) : (
            <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-3 text-xs uppercase tracking-wider text-brand-muted border-b border-brand-border">
                <div className="col-span-2">Rank</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-4 text-right">Score</div>
              </div>
              {leaderboard.map((entry) => {
                const rankDisplay =
                  entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`;
                return (
                  <div
                    key={entry.userId}
                    className={`grid grid-cols-12 px-4 py-3 items-center border-b border-brand-border last:border-b-0 ${
                      entry.isCurrentUser ? "bg-brand-green/5" : ""
                    }`}
                  >
                    <div className="col-span-2 text-sm">{rankDisplay}</div>
                    <div className="col-span-6 text-sm">
                      <span className={entry.isCurrentUser ? "text-brand-green font-medium" : ""}>
                        {entry.username}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-xs text-brand-green ml-1">(you)</span>
                      )}
                    </div>
                    <div
                      className={`col-span-4 text-right font-mono text-sm font-medium ${
                        entry.score > 0 ? "text-green-400" : entry.score < 0 ? "text-red-400" : "text-gray-400"
                      }`}
                    >
                      {entry.score > 0 ? "+" : ""}{entry.score.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === "members" && (
        <div className="space-y-2">
          {tournament.members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center justify-between bg-brand-card border border-brand-border rounded-lg px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium">
                  {m.username}
                  {m.userId === userId && <span className="text-brand-green ml-1 text-xs">(you)</span>}
                  {m.userId === tournament.createdBy.id && (
                    <span className="text-brand-muted text-xs ml-1">· Creator</span>
                  )}
                </span>
                <p className="text-xs text-brand-muted mt-0.5">
                  Joined {new Date(m.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              {isCreator && m.userId !== userId && tournament.status === "ACTIVE" && (
                <button
                  onClick={() => removeMember(m.userId, m.username)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info tab */}
      {tab === "info" && (
        <div className="space-y-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-4">
            <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">Created by</p>
            <p className="text-sm font-medium">{tournament.createdBy.username}</p>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4">
            <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">Created on</p>
            <p className="text-sm">
              {new Date(tournament.createdAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4">
            <p className="text-xs text-brand-muted uppercase tracking-wider mb-2">Scoring</p>
            <p className="text-sm text-brand-muted leading-relaxed">
              Scores reflect your leaderboard points earned from parlays placed during the tournament period
              that include at least one game from the selected sports. Global leaderboard totals are unaffected.
            </p>
          </div>

          {/* Danger zone */}
          {tournament.status === "ACTIVE" && (
            <div className="border border-red-500/20 rounded-lg p-4">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-3 font-semibold">Danger Zone</p>
              {isCreator ? (
                <button
                  onClick={cancelTournament}
                  className="text-sm text-red-400 border border-red-500/30 rounded-lg px-4 py-2 hover:bg-red-500/10 transition-colors"
                >
                  Cancel Tournament
                </button>
              ) : (
                <button
                  onClick={leaveTournament}
                  className="text-sm text-red-400 border border-red-500/30 rounded-lg px-4 py-2 hover:bg-red-500/10 transition-colors"
                >
                  Leave Tournament
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
