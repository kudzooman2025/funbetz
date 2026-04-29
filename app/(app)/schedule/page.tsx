"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { GROUPS, GROUP_GAMES, TEAM_RANKINGS } from "@/lib/bracket-config";
import { getLogoUrl } from "@/lib/team-logos";

// ─── Group colors ────────────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  A: { bg: "bg-blue-900/30",   border: "border-blue-500/50",   text: "text-blue-400"   },
  B: { bg: "bg-purple-900/30", border: "border-purple-500/50", text: "text-purple-400" },
  C: { bg: "bg-green-900/30",  border: "border-green-500/50",  text: "text-green-400"  },
  D: { bg: "bg-red-900/30",    border: "border-red-500/50",    text: "text-red-400"    },
  E: { bg: "bg-orange-900/30", border: "border-orange-500/50", text: "text-orange-400" },
  F: { bg: "bg-pink-900/30",   border: "border-pink-500/50",   text: "text-pink-400"   },
  G: { bg: "bg-teal-900/30",   border: "border-teal-500/50",   text: "text-teal-400"   },
  H: { bg: "bg-yellow-900/30", border: "border-yellow-500/50", text: "text-yellow-400" },
};

// ─── Knockout schedule (fixed times) ─────────────────────────────────────────
const KNOCKOUT_SCHEDULE = [
  { round: "Quarterfinals", day: "Sunday, May 3", slots: [
    { time: "8:00 AM", label: "QF 1 — #1 Seed vs #8 Seed" },
    { time: "8:00 AM", label: "QF 2 — #4 Seed vs #5 Seed" },
    { time: "8:00 AM", label: "QF 3 — #3 Seed vs #6 Seed" },
    { time: "8:00 AM", label: "QF 4 — #2 Seed vs #7 Seed" },
  ]},
  { round: "Semifinals", day: "Sunday, May 3", slots: [
    { time: "1:00 PM", label: "SF 1 — Winner QF1 vs Winner QF2" },
    { time: "1:00 PM", label: "SF 2 — Winner QF3 vs Winner QF4" },
  ]},
  { round: "Final", day: "Monday, May 4", slots: [
    { time: "8:00 AM", label: "Championship Final" },
  ]},
];

// ─── Team Logo Component ──────────────────────────────────────────────────────
function TeamLogo({ team, size = 40 }: { team: string; size?: number }) {
  const logo = getLogoUrl(team);
  if (!logo) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-brand-surface border border-brand-border flex items-center justify-center text-xs font-bold text-brand-muted flex-shrink-0"
      >
        {team.charAt(0)}
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size }} className="relative flex-shrink-0">
      <Image
        src={logo}
        alt={team}
        fill
        className="object-contain rounded-full"
        sizes={`${size}px`}
      />
    </div>
  );
}

// ─── Game Card ────────────────────────────────────────────────────────────────
function GameCard({ home, away, group, time, round, score }: {
  home: string; away: string; group: string; time: string; round: number; score?: string;
}) {
  const colors = GROUP_COLORS[group];
  const parts = score ? score.split("-") : null;
  const homeGoals = parts?.[0];
  const awayGoals = parts?.[1];
  const hasScore = homeGoals !== undefined && awayGoals !== undefined;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${colors.text}`}>Group {group} · Round {round}</span>
        <span className="text-xs text-brand-muted">{time}</span>
      </div>
      <div className="flex items-center gap-2">
        <TeamLogo team={home} size={36} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${hasScore && Number(homeGoals) > Number(awayGoals) ? "text-brand-green" : "text-white"}`}>{home}</p>
          {TEAM_RANKINGS[home] && (
            <p className="text-xs text-brand-muted">#{TEAM_RANKINGS[home]}</p>
          )}
        </div>
        {hasScore ? (
          <div className="flex items-center gap-1 px-2">
            <span className={`text-lg font-bold ${Number(homeGoals) > Number(awayGoals) ? "text-brand-green" : "text-white"}`}>{homeGoals}</span>
            <span className="text-brand-muted font-bold text-sm">–</span>
            <span className={`text-lg font-bold ${Number(awayGoals) > Number(homeGoals) ? "text-brand-green" : "text-white"}`}>{awayGoals}</span>
          </div>
        ) : (
          <span className="text-brand-muted font-bold text-sm px-1">vs</span>
        )}
        <div className="flex-1 min-w-0 text-right">
          <p className={`text-sm font-semibold truncate ${hasScore && Number(awayGoals) > Number(homeGoals) ? "text-brand-green" : "text-white"}`}>{away}</p>
          {TEAM_RANKINGS[away] && (
            <p className="text-xs text-brand-muted">#{TEAM_RANKINGS[away]}</p>
          )}
        </div>
        <TeamLogo team={away} size={36} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState<"1" | "2" | "knockout">("1");
  const [activeGroup, setActiveGroup] = useState<string>("ALL");
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/scores?challengeId=va26-u13-ad")
      .then((r) => r.json())
      .then((data) => setScores(data))
      .catch(() => {});
  }, []);

  const day1Games = GROUP_GAMES.filter((g) => g.day === 1);
  const day2Games = GROUP_GAMES.filter((g) => g.day === 2);

  const filteredDay1 = activeGroup === "ALL" ? day1Games : day1Games.filter((g) => g.group === activeGroup);
  const filteredDay2 = activeGroup === "ALL" ? day2Games : day2Games.filter((g) => g.group === activeGroup);

  // Group teams with rankings, sorted best → worst
  const groupsWithRankings = Object.entries(GROUPS).map(([letter, teams]) => ({
    letter,
    teams: [...teams].sort((a, b) => (TEAM_RANKINGS[a] ?? 9999) - (TEAM_RANKINGS[b] ?? 9999)),
  }));

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-5">

      {/* Hero Header */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/30 rounded-full px-4 py-1.5 mb-3">
          <span className="text-brand-green text-xs font-bold uppercase tracking-widest">MLS NEXT Cup Qualifiers</span>
        </div>
        <h1 className="text-2xl font-bold text-white">VA Regional · U13 AD</h1>
        <p className="text-brand-muted text-sm mt-1">May 1–4, 2026 · Virginia</p>
        <a
          href="https://www.mlssoccer.com/mlsnext/tournaments/cup/qualifiers/standings/virginia_regional"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-brand-gold hover:text-yellow-300 transition-colors"
        >
          🌐 Official MLS NEXT Standings →
        </a>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 bg-brand-card rounded-xl p-1 border border-brand-border">
        {[
          { key: "1",        label: "📅 May 1",     sub: "Group Play" },
          { key: "2",        label: "📅 May 2",     sub: "Group Play" },
          { key: "knockout", label: "⚡ May 3–4",   sub: "Knockouts" },
        ].map(({ key, label, sub }) => (
          <button
            key={key}
            onClick={() => setActiveDay(key as typeof activeDay)}
            className={`flex-1 py-2 px-2 rounded-lg text-center transition-all ${
              activeDay === key
                ? "bg-brand-green text-brand-dark font-bold"
                : "text-brand-muted hover:text-white"
            }`}
          >
            <div className="text-sm font-semibold">{label}</div>
            <div className={`text-xs ${activeDay === key ? "text-brand-dark/70" : "text-brand-muted"}`}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Group Filter (only for group play days) */}
      {activeDay !== "knockout" && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveGroup("ALL")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              activeGroup === "ALL"
                ? "bg-white text-brand-dark border-white"
                : "border-brand-border text-brand-muted hover:text-white"
            }`}
          >
            All Groups
          </button>
          {Object.keys(GROUPS).map((g) => {
            const c = GROUP_COLORS[g];
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  activeGroup === g
                    ? `${c.bg} ${c.border} ${c.text}`
                    : "border-brand-border text-brand-muted hover:text-white"
                }`}
              >
                Group {g}
              </button>
            );
          })}
        </div>
      )}

      {/* Day 1 Games */}
      {activeDay === "1" && (
        <div className="space-y-2">
          <p className="text-xs text-brand-muted uppercase tracking-widest font-semibold px-1">
            Friday, May 1 · {filteredDay1.length} games
          </p>
          {filteredDay1.map((game) => (
            <GameCard key={game.id} {...game} score={scores[String(game.id)]} />
          ))}
        </div>
      )}

      {/* Day 2 Games */}
      {activeDay === "2" && (
        <div className="space-y-2">
          <p className="text-xs text-brand-muted uppercase tracking-widest font-semibold px-1">
            Saturday, May 2 · {filteredDay2.length} games
          </p>
          {filteredDay2.map((game) => (
            <GameCard key={game.id} {...game} score={scores[String(game.id)]} />
          ))}
        </div>
      )}

      {/* Knockout Schedule */}
      {activeDay === "knockout" && (
        <div className="space-y-4">
          {KNOCKOUT_SCHEDULE.map(({ round, day, slots }) => (
            <div key={round} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-white font-bold">{round}</span>
                <span className="text-xs text-brand-muted">· {day}</span>
              </div>
              {slots.map((slot) => (
                <div key={slot.label} className="bg-brand-card border border-brand-border rounded-xl p-4 flex items-center gap-3">
                  <div className="bg-brand-green/20 border border-brand-green/40 rounded-lg px-3 py-2 text-center min-w-[64px]">
                    <p className="text-brand-green font-bold text-sm">{slot.time}</p>
                  </div>
                  <p className="text-white text-sm font-medium">{slot.label}</p>
                </div>
              ))}
            </div>
          ))}

          <div className="bg-brand-surface border border-brand-border rounded-xl p-4 mt-4">
            <p className="text-xs text-brand-muted mb-3 font-semibold uppercase tracking-widest">QF Seeding Format</p>
            <p className="text-sm text-white leading-relaxed">
              The 8 group winners are ranked #1–#8 by points per match, then goal difference, then goals scored.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {["#1 vs #8","#4 vs #5","#3 vs #6","#2 vs #7"].map((m) => (
                <div key={m} className="bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-center text-brand-muted">{m}</div>
              ))}
            </div>
          </div>

          <Link
            href="/brackets/va26-u13-ad"
            className="w-full block text-center bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors mt-2"
          >
            🏆 Fill Out Your Bracket →
          </Link>
        </div>
      )}

      {/* Group Standings Preview */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-bold text-white">Group Rosters</h2>
          <span className="text-xs text-brand-muted">National ranking shown</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groupsWithRankings.map(({ letter, teams }) => {
            const colors = GROUP_COLORS[letter];
            return (
              <div key={letter} className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${colors.text}`}>Group {letter}</p>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div key={team} className="flex items-center gap-2">
                      <TeamLogo team={team} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{team}</p>
                      </div>
                      {TEAM_RANKINGS[team] && (
                        <span cla