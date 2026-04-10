"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TournamentSummary } from "@/lib/types";
import { LEAGUES } from "@/lib/constants";

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((res) => res.json())
      .then((data) => setTournaments(data.tournaments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    setJoinLoading(true);
    try {
      const res = await fetch("/api/tournaments/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "Failed to join tournament.");
      } else {
        router.push(`/tournaments/${data.tournament.id}`);
      }
    } catch {
      setJoinError("Something went wrong.");
    } finally {
      setJoinLoading(false);
    }
  }

  const active = tournaments.filter((t) => t.status === "ACTIVE");
  const past = tournaments.filter((t) => t.status !== "ACTIVE");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Link
          href="/tournaments/create"
          className="bg-brand-green text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-brand-green/90 transition-colors"
        >
          + Create
        </Link>
      </div>

      {/* Join by invite code */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Join with Invite Code
        </h2>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            maxLength={10}
            className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm font-mono uppercase placeholder:normal-case placeholder:text-brand-muted focus:outline-none focus:border-brand-green"
          />
          <button
            type="submit"
            disabled={joinLoading || !joinCode.trim()}
            className="bg-brand-green text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {joinLoading ? "Joining…" : "Join"}
          </button>
        </form>
        {joinError && (
          <p className="text-red-400 text-xs mt-2">{joinError}</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-brand-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-lg p-10 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-brand-muted mb-1">No tournaments yet.</p>
          <p className="text-sm text-brand-muted">
            Create one or join a friend&apos;s with an invite code.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
                Active
              </h2>
              <div className="space-y-3">
                {active.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
                Past
              </h2>
              <div className="space-y-3">
                {past.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TournamentCard({ tournament: t }: { tournament: TournamentSummary }) {
  const now = new Date();
  const start = new Date(t.startDate);
  const end = new Date(t.endDate);

  const dateRange = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const sportLabels = t.sports
    .map((s) => {
      const league = LEAGUES[s as keyof typeof LEAGUES];
      return league ? `${league.emoji} ${league.name}` : s;
    })
    .join("  ·  ");

  const statusBadge =
    t.status === "ACTIVE"
      ? now < start
        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        : now > end
        ? "bg-gray-500/10 text-gray-400 border border-gray-500/20"
        : "bg-brand-green/10 text-brand-green border border-brand-green/20"
      : "bg-gray-500/10 text-gray-400 border border-gray-500/20";

  const statusLabel =
    t.status === "CANCELLED"
      ? "Cancelled"
      : now < start
      ? "Upcoming"
      : now > end
      ? "Ended"
      : "Live";

  return (
    <Link href={`/tournaments/${t.id}`}>
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 hover:border-brand-green/40 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{t.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>
                {statusLabel}
              </span>
              {t.isCreator && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-surface text-brand-muted border border-brand-border">
                  Creator
                </span>
              )}
            </div>
            <p className="text-xs text-brand-muted mt-1">{dateRange}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold">{t.memberCount}</p>
            <p className="text-xs text-brand-muted">
              {t.memberCount === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
        {t.sports.length > 0 && (
          <p className="text-xs text-brand-muted truncate">{sportLabels}</p>
        )}
      </div>
    </Link>
  );
}
