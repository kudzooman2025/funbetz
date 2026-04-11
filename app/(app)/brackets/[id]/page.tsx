"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  GROUPS, GROUP_KEYS, R16_SEEDS, QF_SEEDS, SF_SEEDS,
  ROUND_POINTS, MAX_SCORE,
  type BracketPicks, EMPTY_PICKS,
  getR16Teams, getQFTeams, getSFTeams, getFinalTeams,
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

function MatchupPick({
  label,
  home,
  away,
  picked,
  locked,
  pointValue,
  onPick,
}: {
  label: string;
  home: string;
  away: string;
  picked: string;
  locked: boolean;
  pointValue: number;
  onPick: (team: string) => void;
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<BracketChallenge | null>(null);
  const [picks, setPicks] = useState<BracketPicks>(EMPTY_PICKS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"bracket" | "leaderboard">("bracket");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Load challenge + existing entry
  useEffect(() => {
    if (!id) return;
    fetch(`/api/brackets/${id}`)
      .then((r) => r.json())
      .then((c: BracketChallenge) => {
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
  }, [id]);

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
      // If team is already second, swap
      const second = current.second === team ? current.first : current.second;
      return { ...p, groups: { ...p.groups, [group]: { first: team, second } } };
    });
  };

  const setGroupSecond = (group: string, team: string) => {
    setPicks((p) => {
      const current = p.groups[group] ?? { first: "", second: "" };
      const first = current.first === team ? current.second : current.first;
      return { ...p, groups: { ...p.groups, [group]: { first, second: team } } };
    });
  };

  const setR16Pick = (matchId: number, team: string) => {
    setPicks((p) => {
      const newR16 = { ...p.r16, [String(matchId)]: team };
      // Clear downstream picks that depended on this R16 match
      const qfSeed = QF_SEEDS.find((q) => q.homeR16 === matchId || q.awayR16 === matchId);
      const newQF = { ...p.qf };
      if (qfSeed) {
        const qfWinner = newQF[String(qfSeed.id)];
        const [qfH, qfA] = [newR16[String(qfSeed.homeR16)] || "", newR16[String(qfSeed.awayR16)] || ""];
        if (qfWinner && qfWinner !== qfH && qfWinner !== qfA) delete newQF[String(qfSeed.id)];
      }
      return { ...p, r16: newR16, qf: newQF };
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
            { label: "Group 1st/2nd", pts: ROUND_POINTS.groupFirst },
            { label: "Round of 16", pts: ROUND_POINTS.r16 },
            { label: "Quarterfinals", pts: ROUND_POINTS.qf },
            { label: "Semifinals", pts: ROUND_POINTS.sf },
            { label: "Champion", pts: ROUND_POINTS.final },
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
                {complete && <span className="text-brand-green font-semibold">✓ Complete!</span>}
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
              Group Stage — Predict 1st & 2nd
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GROUP_KEYS.map((g) => {
                const teams = GROUPS[g];
                const gPicks = picks.groups[g] ?? { first: "", second: "" };
                return (
                  <div key={g} className="bg-brand-card border border-brand-border rounded-xl p-3 space-y-2">
                    <div className="text-xs font-bold text-brand-gold uppercase">Group {g}</div>
                    <div className="space-y-1.5">
                      {teams.map((team) => {
                        const isFirst = gPicks.first === team;
                        const isSecond = gPicks.second === team;
                        return (
                          <div key={team} className="flex gap-1">
                            <button
                              title="Pick 1st"
                              disabled={locked}
                              onClick={() => setGroupFirst(g, team)}
                              className={`w-6 h-6 rounded text-[10px] font-bold border shrink-0 transition-colors ${
                                isFirst
                                  ? "bg-brand-green text-black border-brand-green"
                                  : locked
                                  ? "bg-brand-surface border-brand-border text-brand-muted cursor-not-allowed"
                                  : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-green"
                              }`}
                            >
                              1
                            </button>
                            <button
                              title="Pick 2nd"
                              disabled={locked}
                              onClick={() => setGroupSecond(g, team)}
                              className={`w-6 h-6 rounded text-[10px] font-bold border shrink-0 transition-colors ${
                                isSecond
                                  ? "bg-brand-gold text-black border-brand-gold"
                                  : locked
                                  ? "bg-brand-surface border-brand-border text-brand-muted cursor-not-allowed"
                                  : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-gold"
                              }`}
                            >
                              2
                            </button>
                            <span
                              className={`text-xs flex-1 min-w-0 truncate flex items-center ${
                                isFirst ? "text-brand-green font-semibold" : isSecond ? "text-brand-gold font-semibold" : "text-gray-400"
                              }`}
                            >
                              {team}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-brand-muted pt-1 border-t border-brand-border">
                      {gPicks.first ? <span className="text-brand-green">1st: {gPicks.first.split(" ")[0]}</span> : <span>1st: —</span>}
                      {" · "}
                      {gPicks.second ? <span className="text-brand-gold">2nd: {gPicks.second.split(" ")[0]}</span> : <span>2nd: —</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── ROUND OF 16 ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-3">
              Round of 16 — +{ROUND_POINTS.r16}pt each
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {R16_SEEDS.map((seed) => {
                const [home, away] = getR16Teams(seed.id, picks);
                return (
                  <MatchupPick
                    key={seed.id}
                    label={`Match ${seed.id} (${seed.home} v ${seed.away})`}
                    home={home}
                    away={away}
                    picked={picks.r16[String(seed.id)] || ""}
                    locked={locked}
                    pointValue={ROUND_POINTS.r16}
                    onPick={(t) => setR16Pick(seed.id, t)}
                  />
                );
              })}
            </div>
          </section>

          {/* ── QUARTERFINALS ───────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-3">
              Quarterfinals — +{ROUND_POINTS.qf}pt each
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QF_SEEDS.map((seed) => {
                const [home, away] = getQFTeams(seed.id, picks);
                return (
                  <MatchupPick
                    key={seed.id}
                    label={`QF ${seed.id}`}
                    home={home}
                    away={away}
                    picked={picks.qf[String(seed.id)] || ""}
                    locked={locked}
                    pointValue={ROUND_POINTS.qf}
                    onPick={(t) => setQFPick(seed.id, t)}
                  />
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
