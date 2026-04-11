"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BracketSummary {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  lockTime: string;
  locked: boolean;
  entryCount: number;
  myEntry: { id: string; score: number; updatedAt: string } | null;
}

export default function BracketsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [brackets, setBrackets] = useState<BracketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/brackets")
      .then((r) => {
        if (!r.ok) { setLoading(false); return null; }
        return r.json();
      })
      .then((d) => {
        if (Array.isArray(d)) setBrackets(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏆 Bracket Challenges</h1>
        <p className="text-brand-muted text-sm mt-1">
          Fill out your bracket before kickoff. More points for later rounds — March Madness style.
        </p>
      </div>

      {brackets.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-xl p-8 text-center text-brand-muted">
          No bracket challenges available yet.
        </div>
      ) : (
        <div className="space-y-4">
          {brackets.map((b) => {
            const lockDate = new Date(b.lockTime);
            const timeLeft = lockDate.getTime() - Date.now();
            const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            return (
              <Link key={b.id} href={`/brackets/${b.id}`}>
                <div className="bg-brand-card border border-brand-border rounded-xl p-5 hover:border-brand-green transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-lg">{b.name}</h2>
                        {b.locked ? (
                          <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full border border-red-800">
                            🔒 Locked
                          </span>
                        ) : (
                          <span className="text-xs bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/40">
                            ✏️ Open
                          </span>
                        )}
                      </div>
                      {b.description && (
                        <p className="text-brand-muted text-sm mt-1">{b.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-brand-muted">
                        <span>👥 {b.entryCount} {b.entryCount === 1 ? "entry" : "entries"}</span>
                        {!b.locked && timeLeft > 0 && (
                          <span className="text-yellow-400">
                            ⏰ Locks in {daysLeft > 0 ? `${daysLeft}d ` : ""}{hoursLeft}h
                          </span>
                        )}
                        <span>
                          Locks: {lockDate.toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {b.myEntry ? (
                        <div>
                          <div className="text-brand-green font-bold text-xl">{b.myEntry.score} pts</div>
                          <div className="text-brand-muted text-xs">Your score</div>
                          <div className="mt-2 text-xs text-brand-green">✓ Submitted</div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-brand-muted text-sm">Not entered</div>
                          {!b.locked && (
                            <div className="mt-2 bg-brand-green text-black text-sm font-bold px-3 py-1.5 rounded-lg">
                              Fill Bracket →
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
