"use client";

/**
 * /eacf — the dynasty board.
 *
 * Step 1 shows the week read-only. Blind line submission, betting and the
 * standings arrive in steps 2-4; see EACF_SPEC.md.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface Side {
  id: string;
  name: string;
  school: string | null;
}

interface Game {
  id: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  publishedLine: number | null;
  currentLine: number | null;
  home: Side;
  away: Side;
  isYours: boolean;
}

interface Me {
  isMember: boolean;
  isAdmin: boolean;
  coach: { id: string; name: string; seedRank: number } | null;
  week: {
    seasonLabel: string;
    weekNumber: number;
    status: string;
    games: Game[];
  } | null;
}

export default function EacfPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/eacf/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ isMember: false, isAdmin: false, coach: null, week: null }));
  }, []);

  if (!me) {
    return <p className="text-brand-muted text-sm py-8 text-center">Loading…</p>;
  }

  if (!me.isMember && !me.isAdmin) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display font-bold text-[26px] tracking-[.03em] uppercase">
          Dynasty members only
        </h1>
        <p className="text-brand-muted text-sm mt-2 max-w-sm mx-auto">
          EACF is a private board for the College Football dynasty. If you should
          have access, ask the commissioner to link your account to your coach.
        </p>
      </div>
    );
  }

  const week = me.week;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-[.03em] uppercase leading-none">
            EACF
          </h1>
          <p className="font-mono text-[11px] text-brand-dim mt-1.5">
            {week
              ? `${week.seasonLabel} · week ${week.weekNumber}`
              : "no weeks yet"}
            {me.coach && ` · you are ${me.coach.name}`}
          </p>
        </div>
        {me.isAdmin && (
          <Link
            href="/eacf/admin"
            className="font-display text-[13px] tracking-[.1em] uppercase text-brand-muted hover:text-white transition-colors"
          >
            Setup
          </Link>
        )}
      </div>

      {!week || week.games.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-[5px] p-8 text-center">
          <p className="text-brand-muted text-sm">
            No games on the board yet.
          </p>
          <p className="text-brand-dim text-xs mt-2">
            The commissioner posts the week&apos;s matchups here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {week.games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}

      <p className="font-mono text-[10px] text-brand-dim">
        Setting lines and placing bets open up next.
      </p>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const final = game.status === "FINAL";
  const homeWon =
    final && game.homeScore !== null && game.awayScore !== null
      ? game.homeScore > game.awayScore
      : false;

  return (
    <div className="bg-brand-card border border-brand-border rounded-[5px] overflow-hidden">
      <div className="flex items-center justify-between py-[7px] px-2.5 bg-brand-raised border-b border-brand-border">
        <span className="font-display text-[12px] tracking-[.14em] uppercase text-brand-muted">
          {game.isYours ? "Your game" : " "}
        </span>
        <span
          className={`font-display text-[11px] tracking-[.14em] uppercase ${
            final
              ? "text-brand-green"
              : game.status === "LOCKED"
                ? "text-brand-gold"
                : "text-brand-dim"
          }`}
        >
          {game.status.replace("_", " ").toLowerCase()}
        </span>
      </div>

      <div className="flex flex-col">
        <SideRow side={game.away} score={game.awayScore} won={final && !homeWon} />
        <div className="h-px bg-brand-border mx-2.5" />
        <SideRow side={game.home} score={game.homeScore} won={final && homeWon} />
      </div>

      {game.isYours && (
        <div className="px-2.5 py-1.5 border-t border-brand-border">
          <span className="font-mono text-[10px] text-brand-dim">
            you don&apos;t set the line or bet on your own game
          </span>
        </div>
      )}
    </div>
  );
}

function SideRow({
  side,
  score,
  won,
}: {
  side: Side;
  score: number | null;
  won: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-2.5 min-h-[46px]">
      <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-brand-surface border border-brand-line flex items-center justify-center font-display text-[13px] text-brand-muted">
        {side.name.charAt(0)}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={`font-display font-semibold text-[17px] tracking-[.03em] uppercase truncate ${
            won ? "text-brand-green" : "text-[#C7D0D4]"
          }`}
        >
          {side.name}
        </div>
        {side.school && (
          <div className="font-mono text-[10px] text-brand-dim truncate">
            {side.school}
          </div>
        )}
      </div>
      {score !== null && (
        <span
          className={`font-mono font-semibold text-[20px] ${
            won ? "text-brand-green" : "text-brand-muted"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
