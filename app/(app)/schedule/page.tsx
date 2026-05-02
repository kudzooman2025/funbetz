"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { GROUPS, GROUP_GAMES, TEAM_RANKINGS } from "@/lib/bracket-config";
import { getLogoUrl } from "@/lib/team-logos";

// Group colors
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

const KNOCKOUT_SCHEDULE = [
  { round: "Quarterfinals", day: "Saturday, May 3", slots: [
    { time: "8:00 AM", label: "QF 1 — Group A Winner vs Group H Winner" },
    { time: "8:00 AM", label: "QF 2 — Group D Winner vs Group E Winner" },
    { time: "8:00 AM", label: "QF 3 — Group C Winner vs Group F Winner" },
    { time: "8:00 AM", label: "QF 4 — Group B Winner vs Group G Winner" },
  ]},
  { round: "Semifinals", day: "Saturday, May 3", slots: [
    { time: "1:00 PM", label: "SF 1 — Winner QF1 (A/H) vs Winner QF2 (D/E)" },
    { time: "1:00 PM", label: "SF 2 — Winner QF3 (C/F) vs Winner QF4 (B/G)" },
  ]},
  { round: "Final", day: "Sunday, May 4", slots: [
    { time: "8:00 AM", label: "Championship Final" },
  ]},
];

// Team Logo
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
      <Image src={logo} alt={team} fill className="object-contain rounded-full" sizes={`${size}px`} />
    </div>
  );
}

// Game Card with optional inline admin edit
function GameCard({
  id, home, away, group, time, round, score, isAdmin, onSave,
}: {
  id: number;
  home: string;
  away: string;
  group: string;
  time: string;
  round: number;
  score?: string;
  isAdmin?: boolean;
  onSave?: (gameId: string, score: string) => void;
}) {
  const colors = GROUP_COLORS[group];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const scoreStr = score ?? "";
  const [gcRegPart, gcPkPart] = scoreStr.includes(" PK") ? scoreStr.split(" PK") : [scoreStr, ""];
  const gcRegParts = gcRegPart.split("-");
  const gcPkParts = gcPkPart ? gcPkPart.split("-") : ["", ""];
  const [homeVal, setHomeVal] = useState(gcRegParts[0] ?? "");
  const [awayVal, setAwayVal] = useState(gcRegParts[1] ?? "");
  const [pkHomeVal, setPkHomeVal] = useState(gcPkParts[0] ?? "");
  const [pkAwayVal, setPkAwayVal] = useState(gcPkParts[1] ?? "");
  const isDraw = homeVal !== "" && awayVal !== "" && homeVal === awayVal;

  // Sync inputs if score prop changes externally
  useEffect(() => {
    if (!editing) {
      const s = score ?? "";
      const [rp, pp] = s.includes(" PK") ? s.split(" PK") : [s, ""];
      const rparts = rp.split("-");
      const pparts = pp ? pp.split("-") : ["", ""];
      setHomeVal(rparts[0] ?? "");
      setAwayVal(rparts[1] ?? "");
      setPkHomeVal(pparts[0] ?? "");
      setPkAwayVal(pparts[1] ?? "");
    }
  }, [score, editing]);

  async function handleSave() {
    if (homeVal === "" || awayVal === "") return;
    setSaving(true);
    const pkSuffix = (isDraw && pkHomeVal !== "" && pkAwayVal !== "")
      ? ` PK${pkHomeVal}-${pkAwayVal}` : "";
    const winner = `${homeVal}-${awayVal}${pkSuffix}`;
    try {
      const res = await fetch("/api/admin/bracket-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: "va26-u13-ad",
          round: "group_score",
          key: String(id),
          winner,
        }),
      });
      if (res.ok) {
        onSave?.(String(id), winner);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${colors.text}`}>Group {group} · Round {round}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-muted">{time}</span>
          {isAdmin && (
            <button
              onClick={() => setEditing(!editing)}
              className="text-brand-muted hover:text-brand-gold transition-colors text-sm leading-none"
              title={editing ? "Cancel edit" : "Edit score"}
            >
              {editing ? "✕" : "✏️"}
            </button>
          )}
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center gap-2">
        <TeamLogo team={home} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{home}</p>
          {TEAM_RANKINGS[home] && <p className="text-xs text-brand-muted">#{TEAM_RANKINGS[home]}</p>}
        </div>
        <div className="flex-shrink-0 px-2 text-center min-w-[52px]">
          {score && !editing ? (
            score.includes(" PK") ? (
              <span className="text-center leading-tight">
                <span className="block text-white font-bold text-base tabular-nums">{score.split(" PK")[0].replace("-", " – ")}</span>
                <span className="block text-yellow-400 font-semibold text-xs">PKs {score.split(" PK")[1]}</span>
              </span>
            ) : (
              <span className="text-white font-bold text-base tabular-nums">{score.replace("-", " – ")}</span>
            )
          ) : !editing ? (
            <span className="text-brand-muted font-bold text-sm">vs</span>
          ) : null}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-semibold text-white truncate">{away}</p>
          {TEAM_RANKINGS[away] && <p className="text-xs text-brand-muted">#{TEAM_RANKINGS[away]}</p>}
        </div>
        <TeamLogo team={away} size={36} />
      </div>

      {/* Inline edit row — admin only */}
      {editing && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
          <span className="text-xs text-brand-muted truncate flex-1">{home}</span>
          <input
            type="number" min="0" max="20"
            value={homeVal}
            onChange={(e) => setHomeVal(e.target.value)}
            className="w-12 text-center text-base font-bold bg-gray-800 border border-gray-600 rounded-lg px-1 py-1 text-white focus:border-brand-green focus:outline-none"
          />
          <span className="text-gray-500 font-bold text-xs">–</span>
          <input
            type="number" min="0" max="20"
            value={awayVal}
            onChange={(e) => setAwayVal(e.target.value)}
            className="w-12 text-center text-base font-bold bg-gray-800 border border-gray-600 rounded-lg px-1 py-1 text-white focus:border-brand-green focus:outline-none"
          />
          <span className="text-xs text-brand-muted truncate flex-1 text-right">{away}</span>
          {isDraw && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-yellow-400 font-semibold whitespace-nowrap">PKs:</span>
              <input
                type="number" min="0" max="20"
                value={pkHomeVal}
                onChange={(e) => setPkHomeVal(e.target.value)}
                className="w-10 text-center text-sm font-bold bg-gray-800 border border-yellow-500/40 rounded-lg px-1 py-1 text-yellow-300 focus:border-yellow-400 focus:outline-none"
              />
              <span className="text-yellow-600 font-bold text-xs">–</span>
              <input
                type="number" min="0" max="20"
                value={pkAwayVal}
                onChange={(e) => setPkAwayVal(e.target.value)}
                className="w-10 text-center text-sm font-bold bg-gray-800 border border-yellow-500/40 rounded-lg px-1 py-1 text-yellow-300 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={homeVal === "" || awayVal === "" || saving}
            className="ml-1 px-3 py-1.5 bg-brand-green hover:bg-green-500 disabled:opacity-40 text-black text-xs font-bold rounded-lg transition-colors"
          >
            {saving ? "..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Day 1 Recap Article ─────────────────────────────────────────────────────
function Day1RecapArticle() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-brand-green text-sm">📰</span>
          <span className="text-sm font-bold text-white">Day 1 Roundup — Leaders Emerge, Group H Goes Down to the Wire</span>
        </div>
        <span className="text-brand-muted text-xs ml-2 flex-shrink-0">{expanded ? "▲ Collapse" : "▼ Read"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-brand-border text-sm text-brand-muted leading-relaxed">
          <p className="text-xs text-brand-muted pt-3 uppercase tracking-widest font-semibold">May 1, 2026 · Virginia Regional · U13 AD</p>

          <p className="text-white/90">
            Eight groups, sixteen first-round fixtures, and some early statements have been made at the 2026 MLS NEXT Cup Qualifiers
            in Virginia. After a full Day 1 slate, a handful of clubs have separated themselves from the pack — and a fascinating
            tiebreaker battle is already brewing in Group H.
          </p>

          <div>
            <p className="font-bold text-white mb-1">The Dominant Ones</p>
            <p>
              <span className="text-white font-semibold">FC DELCO</span> (Group C) put on the most commanding display of the day,
              outscoring opponents 8–0 across two games for the best goal differential in the tournament at +8. They will enter Day 2
              with an iron grip on their group and loom as a genuine Championship contender.
            </p>
            <p className="mt-2">
              Not far behind, <span className="text-white font-semibold">Fox Soccer Academy Carolinas</span> (Group E) posted an
              8–1 goal tally for a +7 differential, while <span className="text-white font-semibold">Real Futbol Academy</span> (Group G)
              remain perfect and clinical with a 6–0 scoreline.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">The Group H Standoff</p>
            <p>
              The most compelling subplot heading into Day 2 is the battle atop Group H.
              Both <span className="text-white font-semibold">Players Development Academy</span> and{" "}
              <span className="text-white font-semibold">Charlotte Independence Soccer Club</span> have won both of their games,
              sitting level on 6 points with identical +5 goal differentials. PDA edges Charlotte on goals scored (6 vs. 5) —
              but with the final group game still to play, nothing is settled.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">Clean Sheet Kings</p>
            <p>
              Several group leaders have yet to concede: FC DELCO, Real Futbol Academy, and{" "}
              <span className="text-white font-semibold">Alexandria SA</span> (Group B, 4–0) have all kept clean sheets through
              two games. Alexandria have been particularly clinical, shutting out both opponents while winning comfortably.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">QF Preview — If Current Leaders Hold</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {[
                { label: "QF 1", home: "Springfield SYC", away: "PDA / Charlotte Ind. SC", note: "Group A vs H", hot: false },
                { label: "QF 2", home: "Baltimore Armour", away: "Fox Soccer Academy Car.", note: "Group D vs E", hot: true },
                { label: "QF 3", home: "FC DELCO", away: "Trenton City SC / Queen City Mutiny", note: "Group C vs F", hot: true },
                { label: "QF 4", home: "Alexandria SA", away: "Real Futbol Academy", note: "Group B vs G · Both unbeaten & clean sheets", hot: true },
              ].map(({ label, home, away, note, hot }) => (
                <div key={label} className={`rounded-lg border p-3 space-y-1 ${hot ? "border-brand-green/30 bg-brand-green/5" : "border-brand-border bg-brand-surface"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-green uppercase">{label}</span>
                    {hot && <span className="text-xs text-yellow-400">🔥 Watch this one</span>}
                  </div>
                  <p className="text-white text-xs font-semibold">{home}</p>
                  <p className="text-brand-muted text-xs">vs {away}</p>
                  <p className="text-brand-muted text-xs italic">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-brand-muted italic pt-1">
            Projections based on Day 1 group leaders. All matchups subject to Day 2 results.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Projected QF Matchups (knockout tab) ────────────────────────────────────
function ProjectedQFMatchups() {
  const matchups = [
    {
      qf: "QF 1", pairing: "Group A vs H",
      home: { group: "A", team: "Springfield SYC", pts: 6, gd: 2 },
      away: { group: "H", team: "PDA / Charlotte Ind. SC*", pts: 6, gd: 5 },
      note: "* Group H tied — final game decides",
    },
    {
      qf: "QF 2", pairing: "Group D vs E",
      home: { group: "D", team: "Baltimore Armour", pts: 6, gd: 3 },
      away: { group: "E", team: "Fox Soccer Academy Car.", pts: 6, gd: 7 },
      note: "Both sides won 2/2 and scored freely",
    },
    {
      qf: "QF 3", pairing: "Group C vs F",
      home: { group: "C", team: "FC DELCO", pts: 6, gd: 8 },
      away: { group: "F", team: "Queen City Mutiny FC", pts: 5, gd: 1 },
      note: "Group F confirmed — Queen City Mutiny FC wins on 5pts",
    },
    {
      qf: "QF 4", pairing: "Group B vs G",
      home: { group: "B", team: "Alexandria SA", pts: 6, gd: 4 },
      away: { group: "G", team: "Real Futbol Academy", pts: 6, gd: 6 },
      note: "Both teams unbeaten with clean sheets — 0 goals conceded combined",
    },
  ];

  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2 px-1">
        <p className="text-xs text-brand-muted font-semibold uppercase tracking-widest">Projected QF Matchups</p>
        <span className="text-xs text-brand-muted">· based on Day 1 leaders</span>
      </div>
      {matchups.map(({ qf, pairing, home, away, note }) => (
        <div key={qf} className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-green uppercase tracking-wide">{qf} · {pairing}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{home.team}</p>
              <p className="text-xs text-brand-muted">Group {home.group} · {home.pts}pts · GD {home.gd > 0 ? "+" : ""}{home.gd}</p>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-center flex-shrink-0">
              <p className="text-brand-muted font-bold text-xs">vs</p>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-white font-semibold text-sm truncate">{away.team}</p>
              <p className="text-xs text-brand-muted">Group {away.group} · {away.pts}pts · GD {away.gd > 0 ? "+" : ""}{away.gd}</p>
            </div>
          </div>
          <p className="text-xs text-brand-muted italic border-t border-brand-border pt-2">{note}</p>
        </div>
      ))}
      <p className="text-xs text-brand-muted px-1 pb-1 italic">
        Projections based on Day 1 standings. Updated after Day 2 results are entered.
      </p>
    </div>
  );
}

// Main Page
export default function SchedulePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;

  const [activeDay, setActiveDay] = useState<"1" | "2" | "knockout">("1");
  const [activeGroup, setActiveGroup] = useState<string>("ALL");
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/bracket-scores?challengeId=va26-u13-ad")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { key: string; winner: string }[]) => {
        const map: Record<string, string> = {};
        for (const d of data) map[d.key] = d.winner;
        setScores(map);
      })
      .catch(() => {});
  }, []);

  function handleScoreSaved(gameId: string, score: string) {
    setScores((prev) => ({ ...prev, [gameId]: score }));
  }

  const day1Games = GROUP_GAMES.filter((g) => g.day === 1);
  const day2Games = GROUP_GAMES.filter((g) => g.day === 2);
  const filteredDay1 = activeGroup === "ALL" ? day1Games : day1Games.filter((g) => g.group === activeGroup);
  const filteredDay2 = activeGroup === "ALL" ? day2Games : day2Games.filter((g) => g.group === activeGroup);

  const groupsWithRankings = Object.entries(GROUPS).map(([letter, teams]) => ({
    letter,
    teams: [...teams].sort((a, b) => (TEAM_RANKINGS[a] ?? 9999) - (TEAM_RANKINGS[b] ?? 9999)),
  }));

  function renderGames(games: typeof day1Games) {
    if (activeGroup === "ALL") {
      return Object.keys(GROUPS).map((g) => {
        const groupGames = games.filter((game) => game.group === g);
        if (!groupGames.length) return null;
        const c = GROUP_COLORS[g];
        return (
          <div key={g} className="space-y-2">
            <p className={`text-xs font-bold uppercase tracking-widest px-1 ${c.text}`}>Group {g}</p>
            {groupGames.map((game) => (
              <GameCard
                key={game.id}
                {...game}
                score={scores[String(game.id)]}
                isAdmin={isAdmin}
                onSave={handleScoreSaved}
              />
            ))}
          </div>
        );
      });
    }
    return games.map((game) => (
      <GameCard
        key={game.id}
        {...game}
        score={scores[String(game.id)]}
        isAdmin={isAdmin}
        onSave={handleScoreSaved}
      />
    ));
  }

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
          Official MLS NEXT Standings →
        </a>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 bg-brand-card rounded-xl p-1 border border-brand-border">
        {[
          { key: "1",        label: "May 1",   sub: "Group Play" },
          { key: "2",        label: "May 2",   sub: "Group Play" },
          { key: "knockout", label: "May 3–4", sub: "Knockouts"  },
        ].map(({ key, label, sub }) => (
          <button
            key={key}
            onClick={() => setActiveDay(key as typeof activeDay)}
            className={`flex-1 py-2 px-2 rounded-lg text-center transition-all ${
              activeDay === key ? "bg-brand-green text-brand-dark font-bold" : "text-brand-muted hover:text-white"
            }`}
          >
            <div className="text-sm font-semibold">{label}</div>
            <div className={`text-xs ${activeDay === key ? "text-brand-dark/70" : "text-brand-muted"}`}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Group Filter */}
      {activeDay !== "knockout" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveGroup("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
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
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
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

      {/* Day 1 */}
      {activeDay === "1" && (
        <div className="space-y-4">
          <p className="text-xs text-brand-muted uppercase tracking-widest font-semibold px-1">
            Friday, May 1 · {filteredDay1.length} games
          </p>
          {renderGames(filteredDay1)}
          <Day1RecapArticle />
        </div>
      )}

      {/* Day 2 */}
      {activeDay === "2" && (
        <div className="space-y-4">
          <p className="text-xs text-brand-muted uppercase tracking-widest font-semibold px-1">
            Saturday, May 2 · {filteredDay2.length} games
          </p>
          {renderGames(filteredDay2)}
        </div>
      )}

      {/* Knockouts */}
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

          <ProjectedQFMatchups />

          <Link
            href="/brackets/va26-u13-ad"
            className="w-full block text-center bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors mt-2"
          >
            Fill Out Your Bracket
          </Link>
        </div>
      )}

      {/* Group Rosters */}
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
                        <span className="text-xs text-brand-muted flex-shrink-0">#{TEAM_RANKINGS[team]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
