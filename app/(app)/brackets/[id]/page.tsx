"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  GROUPS, GROUP_KEYS, GROUP_GAMES, QF_SLOTS, SF_SEEDS,
  ROUND_POINTS, MAX_SCORE, TEAM_RANKINGS,
  type BracketPicks, type MatchScore, type GroupGame,
  EMPTY_PICKS, EMPTY_SCORE,
  getGroupWinners, getSFTeams, getFinalTeams,
  isComplete, pickProgress,
} from "@/lib/bracket-config";

interface BracketChallenge {
  id: string;
  name: string;
  description: string | null;
  lockTime: string;
  locked: boolean;
  entryCount: number;
  myEntry: { id: string; picks: BracketPicks; score: number } | null;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  isMe: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TeamButton({
  team,
  selected,
  disabled,
  onClick,
}: {
  team: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  if (!team) {
    return (
      <button className="w-full text-left px-2 py-1.5 rounded text-xs text-brand-muted italic border border-dashed border-brand-border bg-transparent cursor-not-allowed">
        TBD
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors border truncate ${
        selected
          ? "bg-brand-green/20 border-brand-green text-brand-green font-semibold"
          : disabled
          ? "bg-brand-surface border-brand-border text-brand-muted cursor-not-allowed"
          : "bg-brand-surface border-brand-border text-gray-300 hover:border-brand-green hover:text-brand-green cursor-pointer"
      }`}
    >
      {team}
    </button>
  );
}

function GroupGameScores({
  games,
  scores,
  locked,
  onScore,
}: {
  games: GroupGame[];
  scores: Record<number, MatchScore>;
  locked: boolean;
  onScore: (matchId: number, score: MatchScore) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (g: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const gamesByGroup = GROUP_KEYS.reduce<Record<string, GroupGame[]>>((acc, g) => {
    acc[g] = games.filter((game) => game.group === g);
    return acc;
  }, {});

  return (
    <section>
      <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-1">
        Group Game Score Predictions
      </h2>
      <p className="text-[11px] text-brand-muted mb-3">
        Optional — predict scores for all 48 group games. Used as a tiebreaker on the leaderboard.
      </p>
      <div className="space-y-2">
        {GROUP_KEYS.map((g) => {
          const groupGames = gamesByGroup[g] ?? [];
          const filled = groupGames.filter((gm) => scores[gm.id]?.home !== "" && scores[gm.id]?.away !== "").length;
          const open = openGroups.has(g);
          return (
            <div key={g} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(g)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-brand-surface transition-colors"
              >
                <span className="font-bold text-brand-gold">Group {g}</span>
                <div className="flex items-center gap-2">
                  {filled > 0 && (
                    <span className="text-[10px] text-brand-green">{filled}/{groupGames.length} predicted</span>
                  )}
                  <span className="text-brand-muted text-xs">{open ? "▲" : "▼"}</span>
                </div>
              </button>
              {open && (
                <div className="px-3 pb-3 space-y-2 border-t border-brand-border pt-2">
                  {groupGames.map((game) => {
                    const score = scores[game.id] ?? EMPTY_SCORE;
                    return (
                      <div key={game.id} className="bg-brand-surface rounded-lg p-2">
                        <div className="text-[9px] text-brand-muted mb-1.5">
                          May {game.day} · {game.time} · R{game.round}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-300 flex-1 truncate text-right">{game.home.split(" ")[0]}</span>
                          <input
                            type="number" min="0" max="20"
                            disabled={locked}
                            value={score.home}
                            onChange={(e) => onScore(game.id, { ...score, home: e.target.value })}
                            placeholder="0"
                            className="w-8 text-center text-xs bg-brand-card border border-brand-border rounded px-1 py-0.5 text-white focus:border-brand-gold focus:outline-none disabled:opacity-40"
                          />
                          <span className="text-[10px] text-brand-muted font-bold">–</span>
                          <input
                            type="number" min="0" max="20"
                            disabled={locked}
                            value={score.away}
                            onChange={(e) => onScore(game.id, { ...score, away: e.target.value })}
                            placeholder="0"
                            className="w-8 text-center text-xs bg-brand-card border border-brand-border rounded px-1 py-0.5 text-white focus:border-brand-gold focus:outline-none disabled:opacity-40"
                          />
                          <span className="text-xs text-gray-300 flex-1 truncate">{game.away.split(" ")[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ScoreInput({
  homeTeam,
  awayTeam,
  score,
  locked,
  onChange,
}: {
  homeTeam: string;
  awayTeam: string;
  score: MatchScore;
  locked: boolean;
  onChange: (s: MatchScore) => void;
}) {
  return (
    <div className="mt-1.5 pt-1.5 border-t border-brand-border">
      <div className="text-[9px] text-brand-muted mb-1 text-center">Score (optional · +1 bonus)</div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[9px] text-gray-400 truncate max-w-[52px] text-right">{homeTeam.split(" ")[0]}</span>
        <input
          type="number" min="0" max="20"
          disabled={locked}
          value={score.home}
          onChange={(e) => onChange({ ...score, home: e.target.value })}
          className="w-8 text-center text-xs bg-brand-surface border border-brand-border rounded px-1 py-0.5 text-white focus:border-brand-gold focus:outline-none disabled:opacity-40"
          placeholder="0"
        />
        <span className="text-[10px] text-brand-muted font-bold">–</span>
        <input
          type="number" min="0" max="20"
          disabled={locked}
          value={score.away}
          onChange={(e) => onChange({ ...score, away: e.target.value })}
          className="w-8 text-center text-xs bg-brand-surface border border-brand-border rounded px-1 py-0.5 text-white focus:border-brand-gold focus:outline-none disabled:opacity-40"
          placeholder="0"
        />
        <span className="text-[9px] text-gray-400 truncate max-w-[52px]">{awayTeam.split(" ")[0]}</span>
      </div>
    </div>
  );
}

function MatchupPick({
  label,
  home,
  away,
  picked,
  locked,
  pointValue,
  onPick,
  score,
  onScore,
}: {
  label: string;
  home: string;
  away: string;
  picked: string;
  locked: boolean;
  pointValue: number;
  onPick: (team: string) => void;
  score?: MatchScore;
  onScore?: (s: MatchScore) => void;
}) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-2 space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-brand-muted font-medium uppercase tracking-wide">{label}</span>
        <span className="text-[10px] text-brand-gold">+{pointValue}pt</span>
      </div>
      <TeamButton
        team={home}
        selected={picked === home}
        disabled={locked || !home}
        onClick={() => onPick(home)}
      />
      <div className="text-center text-[9px] text-brand-muted">vs</div>
      <TeamButton
        team={away}
        selected={picked === away}
        disabled={locked || !away}
        onClick={() => onPick(away)}
      />
      {picked && home && away && onScore && score !== undefined && (
        <ScoreInput
          homeTeam={home}
          awayTeam={away}
          score={score}
          locked={locked}
          onChange={onScore}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useSession();
  const router = useRouter();
  const [challenge, setChallenge] = useState<BracketChallenge | null>(null);
  const [picks, setPicks] = useState<BracketPicks>(EMPTY_PICKS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"bracket" | "leaderboard">("bracket");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load challenge + existing entry
  useEffect(() => {
    if (!id || status !== "authenticated") return;
    fetch(`/api/brackets/${id}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((c: BracketChallenge | null) => {
        if (!c || !c.id) return;
        setChallenge(c);
        if (c.myEntry?.picks) {
          // Merge with EMPTY_PICKS to handle missing keys gracefully
          setPicks({
            ...EMPTY_PICKS,
            ...c.myEntry.picks,
            groups: { ...EMPTY_PICKS.groups, ...(c.myEntry.picks.groups ?? {}) },
          });
        }
      });
  }, [id, status]);

  const loadLeaderboard = useCallback(() => {
    if (!id) return;
    setLbLoading(true);
    fetch(`/api/brackets/${id}/leaderboard`)
      .then((r) => r.json())
      .then((d) => { setLeaderboard(d); setLbLoading(false); });
  }, [id]);

  useEffect(() => {
    if (tab === "leaderboard") loadLeaderboard();
  }, [tab, loadLeaderboard]);

  const locked = challenge ? new Date() >= new Date(challenge.lockTime) : false;

  // ── Pick handlers ──────────────────────────────────────────────────────────

  const setGroupFirst = (group: string, team: string) => {
    setPicks((p) => {
      const current = p.groups[group] ?? { first: "", second: "" };
      const second = current.second === team ? current.first : current.second;
      const newGroups = { ...p.groups, [group]: { first: team, second } };
      // Changing any group winner shifts ALL seedings → clear all QF/SF/Final picks
      // (seedings are determined cross-group by PPM, not by adjacent groups)
      if (current.first !== team) {
        return { ...p, groups: newGroups, qf: {}, sf: {}, final: "" };
      }
      return { ...p, groups: newGroups };
    });
  };

  const setQFPick = (matchId: number, team: string) => {
    setPicks((p) => {
      const newQF = { ...p.qf, [String(matchId)]: team };
      const sfSeed = SF_SEEDS.find((s) => s.homeQF === matchId || s.awayQF === matchId);
      const newSF = { ...p.sf };
      if (sfSeed) {
        const sfWinner = newSF[String(sfSeed.id)];
        const [sfH, sfA] = [newQF[String(sfSeed.homeQF)] || "", newQF[String(sfSeed.awayQF)] || ""];
        if (sfWinner && sfWinner !== sfH && sfWinner !== sfA) delete newSF[String(sfSeed.id)];
      }
      return { ...p, qf: newQF, sf: newSF };
    });
  };

  const setSFPick = (matchId: number, team: string) => {
    setPicks((p) => {
      const newSF = { ...p.sf, [String(matchId)]: team };
      const [fH, fA] = [newSF["1"] || "", newSF["2"] || ""];
      const finalPick = p.final && p.final !== fH && p.final !== fA ? "" : p.final;
      return { ...p, sf: newSF, final: finalPick };
    });
  };

  const setFinalPick = (team: string) => {
    setPicks((p) => ({ ...p, final: team }));
  };

  const setQFScore = (matchId: number, score: MatchScore) => {
    setPicks((p) => ({ ...p, qfScores: { ...p.qfScores, [String(matchId)]: score } }));
  };

  const setSFScore = (matchId: number, score: MatchScore) => {
    setPicks((p) => ({ ...p, sfScores: { ...p.sfScores, [String(matchId)]: score } }));
  };

  const setFinalScore = (score: MatchScore) => {
    setPicks((p) => ({ ...p, finalScore: score }));
  };

  const setGroupGameScore = (matchId: number, score: MatchScore) => {
    setPicks((p) => ({
      ...p,
      groupGameScores: { ...(p.groupGameScores ?? {}), [matchId]: score },
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const savePicks = async () => {
    if (!id || saving || locked) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/brackets/${id}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Failed to save picks");
    } finally {
      setSaving(false);
    }
  };

  const clearBracket = async () => {
    if (!id || saving || locked) return;
    setClearing(true);
    setError("");
    try {
      const res = await fetch(`/api/brackets/${id}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks: EMPTY_PICKS }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to clear bracket");
      } else {
        setPicks(EMPTY_PICKS);
        setConfirmClear(false);
      }
    } catch {
      setError("Failed to clear bracket");
    } finally {
      setClearing(false);
    }
  };

  if (!challenge) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progress = pickProgress(picks);
  const complete = isComplete(picks);
  const lockDate = new Date(challenge.lockTime);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold">{challenge.name}</h1>
          {locked ? (
            <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full border border-red-800">🔒 Locked</span>
          ) : (
            <span className="text-xs bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/40">✏️ Open</span>
          )}
        </div>
        <p className="text-brand-muted text-sm mt-1">
          {locked
            ? "Bracket is locked. Scores update as results come in."
            : `Locks ${lockDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${lockDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} EDT`}
        </p>
      </div>

      {/* Scoring key */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-3">
        <div className="text-xs text-brand-muted font-medium mb-2">Point values (max {MAX_SCORE} pts)</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: "Group Winner", pts: ROUND_POINTS.groupFirst },
            { label: "Quarterfinals", pts: ROUND_POINTS.qf },
            { label: "Semifinals", pts: ROUND_POINTS.sf },
            { label: "Champion", pts: ROUND_POINTS.final },
            { label: "Exact Score", pts: ROUND_POINTS.scoreBonus },
          ].map((r) => (
            <span key={r.label} className="bg-brand-card border border-brand-border px-2 py-1 rounded">
              {r.label}: <span className="text-brand-gold font-bold">+{r.pts}pt</span>
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border">
        {(["bracket", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              tab === t
                ? "border-brand-green text-brand-green"
                : "border-transparent text-brand-muted hover:text-gray-300"
            }`}
          >
            {t === "bracket" ? "🏆 My Bracket" : "📊 Leaderboard"}
          </button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div>
          {lbLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-brand-muted py-10">No entries yet.</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((e) => (
                <div
                  key={e.rank}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                    e.isMe ? "bg-brand-green/10 border-brand-green" : "bg-brand-card border-brand-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-6 ${e.rank <= 3 ? "text-brand-gold" : "text-brand-muted"}`}>
                      #{e.rank}
                    </span>
                    <span className={`text-sm ${e.isMe ? "text-brand-green font-semibold" : ""}`}>
                      {e.username}{e.isMe ? " (you)" : ""}
                    </span>
                  </div>
                  <span className="font-bold text-brand-gold">{e.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "bracket" && (
        <div className="space-y-6">
          {/* Progress */}
          {!locked && (
            <div className="bg-brand-card border border-brand-border rounded-xl p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-brand-muted">Picks: {progress.made}/{progress.total}</span>
                <div className="flex items-center gap-2">
                  {complete && <span className="text-brand-green font-semibold">✓ Complete!</span>}
                  {progress.made > 0 && !confirmClear && (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      🗑 Start Over
                    </button>
                  )}
                  {confirmClear && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Clear all picks?</span>
                      <button
                        onClick={clearBracket}
                        disabled={clearing}
                        className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                      >
                        {clearing ? "Clearing…" : "Yes, clear"}
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-2 bg-brand-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-green rounded-full transition-all"
                  style={{ width: `${(progress.made / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ── GROUP STAGE ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-3">
              Group Stage — Pick the Winner (+{ROUND_POINTS.groupFirst}pt each)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GROUP_KEYS.map((g) => {
                const teams = GROUPS[g];
                const gFirst = picks.groups[g]?.first ?? "";
                return (
                  <div key={g} className="bg-brand-card border border-brand-border rounded-xl p-3 space-y-2">
                    <div className="text-xs font-bold text-brand-gold uppercase">Group {g}</div>
                    <div className="space-y-1.5">
                      {teams.map((team) => {
                        const isFirst = gFirst === team;
                        const rank = TEAM_RANKINGS[team];
                        return (
                          <button
                            key={team}
                            disabled={locked}
                            onClick={() => setGroupFirst(g, team)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors border ${
                              isFirst
                                ? "bg-brand-green/20 border-brand-green text-brand-green font-semibold"
                                : locked
                                ? "bg-brand-surface border-brand-border text-brand-muted cursor-not-allowed"
                                : "bg-brand-surface border-brand-border text-gray-300 hover:border-brand-green hover:text-brand-green cursor-pointer"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-1">
                              <span className="truncate">{isFirst ? "✓ " : ""}{team}</span>
                              {rank && (
                                <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${
                                  isFirst ? "bg-brand-green/30 text-brand-green" : "bg-brand-card text-brand-muted"
                                }`}>
                                  #{rank}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {gFirst && (
                      <div className="text-[10px] text-brand-green pt-1 border-t border-brand-border truncate">
                        Winner: {gFirst.split(" ")[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── GROUP GAME SCORES ───────────────────────────────────────── */}
          <GroupGameScores
            games={GROUP_GAMES}
            scores={picks.groupGameScores ?? {}}
            locked={locked}
            onScore={setGroupGameScore}
          />

          {/* ── QUARTERFINALS ───────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-1">
              Quarterfinals — +{ROUND_POINTS.qf}pt each
            </h2>
            <p className="text-[11px] text-brand-muted mb-3">
              Seedings (#1–#8) are determined after group play by PPM → Goal Diff → Goals For.
              Pick who you think wins each seed matchup from your predicted group winners.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QF_SLOTS.map((slot) => {
                const groupWinners = getGroupWinners(picks).filter(Boolean);
                const pickedTeam = picks.qf[String(slot.id)] || "";
                return (
                  <div key={slot.id} className="bg-brand-card border border-brand-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-brand-muted font-medium uppercase tracking-wide">
                        QF {slot.id}
                      </span>
                      <span className="text-[10px] text-brand-gold">+{ROUND_POINTS.qf}pt</span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-semibold">{slot.label}</div>
                    {groupWinners.length < 8 && (
                      <p className="text-[10px] text-amber-500 italic">Pick all 8 group winners first</p>
                    )}
                    <select
                      disabled={locked || groupWinners.length < 8}
                      value={pickedTeam}
                      onChange={(e) => setQFPick(slot.id, e.target.value)}
                      className={`w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none truncate ${
                        pickedTeam
                          ? "bg-brand-green/10 border-brand-green text-brand-green font-semibold"
                          : "bg-brand-surface border-brand-border text-gray-400"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="">— pick winner —</option>
                      {groupWinners.map((team) => {
                        const rank = TEAM_RANKINGS[team];
                        return (
                          <option key={team} value={team}>
                            {team}{rank ? ` (#${rank})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {pickedTeam && (
                      <div className="text-[10px] text-brand-green truncate">✓ {pickedTeam.split(" ")[0]}</div>
                    )}
                    {pickedTeam && groupWinners.length === 8 && (
                      <ScoreInput
                        homeTeam={groupWinners[slot.highSeed - 1] || "Seed " + slot.highSeed}
                        awayTeam={groupWinners[slot.lowSeed - 1] || "Seed " + slot.lowSeed}
                        score={picks.qfScores?.[String(slot.id)] ?? EMPTY_SCORE}
                        locked={locked}
                        onChange={(s) => setQFScore(slot.id, s)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── SEMIFINALS ──────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-3">
              Semifinals — +{ROUND_POINTS.sf}pt each
            </h2>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {SF_SEEDS.map((seed) => {
                const [home, away] = getSFTeams(seed.id, picks);
                return (
                  <MatchupPick
                    key={seed.id}
                    label={`SF ${seed.id}`}
                    home={home}
                    away={away}
                    picked={picks.sf[String(seed.id)] || ""}
                    locked={locked}
                    pointValue={ROUND_POINTS.sf}
                    onPick={(t) => setSFPick(seed.id, t)}
                    score={picks.sfScores?.[String(seed.id)] ?? EMPTY_SCORE}
                    onScore={(s) => setSFScore(seed.id, s)}
                  />
                );
              })}
            </div>
          </section>

          {/* ── FINAL / CHAMPION ────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-3">
              🏆 Champion — +{ROUND_POINTS.final}pt
            </h2>
            <div className="max-w-xs">
              {(() => {
                const [home, away] = getFinalTeams(picks);
                return (
                  <MatchupPick
                    label="Final"
                    home={home}
                    away={away}
                    picked={picks.final || ""}
                    locked={locked}
                    pointValue={ROUND_POINTS.final}
                    onPick={setFinalPick}
                    score={picks.finalScore ?? EMPTY_SCORE}
                    onScore={setFinalScore}
                  />
                );
              })()}
              {picks.final && (
                <div className="mt-3 bg-brand-green/10 border border-brand-green rounded-xl p-3 text-center">
                  <div className="text-[10px] text-brand-muted uppercase tracking-wide mb-1">Your Champion</div>
                  <div className="text-brand-green font-bold">🏆 {picks.final}</div>
                </div>
              )}
            </div>
          </section>

          {/* Save button */}
          {!locked && (
            <div className="fixed bottom-16 md:bottom-6 left-0 right-0 px-4 z-40">
              <div className="max-w-5xl mx-auto">
                {error && (
                  <div className="mb-2 text-center text-red-400 text-sm">{error}</div>
                )}
                <button
                  onClick={savePicks}
                  disabled={saving || progress.made === 0}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    saved
                      ? "bg-brand-green text-black"
                      : saving
                      ? "bg-brand-surface border border-brand-border text-brand-muted"
                      : progress.made === 0
                      ? "bg-brand-surface border border-brand-border text-brand-muted cursor-not-allowed"
                      : "bg-brand-green text-black hover:bg-green-400"
                  }`}
                >
                  {saved ? "✓ Saved!" : saving ? "Saving…" : complete ? "Save Complete Bracket ✓" : `Save Progress (${progress.made}/${progress.total} picks)`}
                </button>
              </div>
            </div>
          )}

          {locked && challenge.myEntry && (
            <div className="bg-brand-card border border-brand-border rounded-xl p-4 text-center">
              <div className="text-brand-muted text-sm">Your current score</div>
              <div className="text-4xl font-bold text-brand-gold mt-1">{challenge.myEntry.score}</div>
              <div className="text-brand-muted text-xs mt-1">out of {MAX_SCORE} possible points</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
