"use client";

/**
 * /leagues/join/<CODE> — shareable invite link.
 *
 * Signed-in visitors are joined to the league automatically and sent straight
 * to it. Guests get a sign-up prompt that returns them here afterwards, so a
 * texted link works end to end for someone without an account.
 */

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function JoinLeaguePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const inviteCode = decodeURIComponent(code || "").trim().toUpperCase();

  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const returnPath = `/leagues/join/${encodeURIComponent(inviteCode)}`;

  const join = useCallback(async () => {
    setJoining(true);
    setError("");
    try {
      const res = await fetch("/api/tournaments/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();

      if (res.ok && data.tournament?.id) {
        router.push(`/leagues/${data.tournament.id}`);
        return;
      }

      // Already a member is a success case from the visitor's point of view.
      if (data.tournament?.id) {
        router.push(`/leagues/${data.tournament.id}`);
        return;
      }
      setError(data.error || "Could not join this league.");
    } catch {
      setError("Could not join this league. Please try again.");
    }
    setJoining(false);
  }, [inviteCode, router]);

  useEffect(() => {
    if (status === "authenticated" && inviteCode) join();
  }, [status, inviteCode, join]);

  if (!inviteCode) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-4xl">🔗</p>
        <p className="text-white font-bold text-lg">Invite link is missing a code</p>
        <Link href="/leagues" className="text-brand-green text-sm hover:underline">
          Go to Leagues
        </Link>
      </div>
    );
  }

  // ── Guest: prompt to create an account, then come back here ──
  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <p className="text-4xl">🏆</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">You&apos;re invited to a Betz league</h1>
          <p className="text-brand-muted text-sm">
            Create a free account to join and start making picks against your friends.
          </p>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-lg py-3">
          <div className="text-xs text-brand-muted">Invite code</div>
          <div className="font-mono text-brand-green font-bold tracking-widest text-lg">
            {inviteCode}
          </div>
        </div>

        <div className="space-y-2">
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(returnPath)}`}
            className="block w-full bg-brand-green text-brand-dark font-bold py-3 rounded-lg hover:bg-green-400 transition-colors"
          >
            Sign Up &amp; Join
          </Link>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(returnPath)}`}
            className="block w-full bg-brand-surface border border-brand-border text-gray-300 font-medium py-3 rounded-lg hover:border-gray-500 transition-colors"
          >
            I already have an account
          </Link>
        </div>
      </div>
    );
  }

  // ── Signed in: joining, or failed ──
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
      {error ? (
        <>
          <p className="text-4xl">😕</p>
          <p className="text-white font-bold text-lg">{error}</p>
          <p className="text-brand-muted text-sm">
            Invite code: <span className="font-mono text-gray-300">{inviteCode}</span>
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={join}
              disabled={joining}
              className="px-4 py-2 bg-brand-green text-brand-dark font-bold text-sm rounded-lg hover:bg-green-400 disabled:opacity-50 transition-colors"
            >
              Try again
            </button>
            <Link
              href="/leagues"
              className="px-4 py-2 bg-brand-surface border border-brand-border text-gray-300 text-sm rounded-lg hover:border-gray-500 transition-colors"
            >
              Go to Leagues
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-4xl">🏆</p>
          <p className="text-white font-bold text-lg">Joining league&hellip;</p>
          <p className="text-brand-muted text-sm font-mono">{inviteCode}</p>
        </>
      )}
    </div>
  );
}
