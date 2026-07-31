"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  WC_GROUPS, WC_GROUP_KEYS, WC_FLAGS, WC_R32, WC_R16, WC_QF, WC_SF,
  WC_LOCK_TIME, WC_BRACKET_ID, WC_EMPTY_PICKS, wcPickProgress,
  type WCPicks,
} from "@/lib/wc2026-config";

const ALL_TEAMS = Object.values(WC_GROUPS).flat();

function flag(team: string) { return WC_FLAGS[team] ?? "🏳"; }

function TeamBtn({ team, selected, onSelect, disabled }: {
  team: string; selected: boolean; onSelect: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-left text-sm transition-all ${
        selected
          ? "bg-brand-yellow text-brand-dark font-bold border border-brand-yellow"
          : disabled
          ? "text-brand-muted/40 cursor-default"
          : "text-white hover:bg-white/10 border border-transparent"
      }`}
    >
      <span>{flag(team)}</span>
      <span className="truncate">{team}</span>
    </button>
  );
}

function resolveTeam(slot: string, picks: WCPicks): string {
  if (!slot.includes(":")) return slot;
  const [type, ref] = slot.split(":");
  if (type === "W" && ref.length === 1) return picks.groups[ref] ?? "";
  if (type === "RU" && ref.length === 1) {
    const winner = (picks.groups as Record<string,string|undefined>)[ref] || "";
    return winner ? `Runner-up: Group ${ref}` : "";
  }
  if (type === "W" && ref.startsWith("R32-")) return (picks.r32 as Record<string,string|undefined>)[ref.replace("R32-", "")] || "";
  if (type === "W" && ref.startsWith("R16-")) return (picks.r16 as Record<string,string|undefined>)[ref.replace("R16-", "")] || "";
  if (type === "W" && ref.startsWith("QF-")) return (picks.qf as Record<string,string|undefined>)[ref.replace("QF-", "")] || "";
  if (type === "W" && ref.startsWith("SF-")) return (picks.sf as Record<string,string|undefined>)[ref.replace("SF-", "")] || "";
  if (slot === "3rd") return "";
  return "";
}

function MatchCard({ homeSlot, awaySlot, picks, round, matchId, onPick, locked }: {
  homeSlot: string; awaySlot: string;
  picks: WCPicks; round: "r32" | "r16" | "qf" | "sf" | "champion";
  matchId: string; onPick: (team: string) => void; locked: boolean;
}) {
  const homeTeam = resolveTeam(homeSlot, picks);
  const awayTeam = resolveTeam(awaySlot, picks);
  const currentPick = round === "champion" ? picks.champion : (picks as any)[round]?.[matchId] ?? "";
  const isHome3rd = homeSlot === "3rd";
  const isAway3rd = awaySlot === "3rd";

  // For 3rd-place slots: show a dropdown of teams not picked as group winners
  const pickedWinners = new Set(Object.values(picks.groups));
  const thirdCandidates = ALL_TEAMS.filter((t) => !pickedWinners.has(t));

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      {/* Home slot */}
      <div
        onClick={() => {
          if (locked || !homeTeam || isHome3rd) return;
          onPick(homeTeam);
        }}
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
          currentPick === homeTeam && homeTeam ? "bg-brand-yellow/20 border-l-2 border-brand-yellow" : "hover:bg-white/5"
        } ${(!homeTeam || locked) ? "cursor-default" : ""}`}
      >
        <span className="text-base">{homeTeam ? flag(homeTeam) : "🏳"}</span>
        <span className={`text-sm font-medium flex-1 truncate ${homeTeam ? "text-white" : "text-brand-muted"}`}>
          {isHome3rd ? "Best 3rd Qualifier" : (homeTeam || `Group ${homeSlot.split(":")[1]} Winner`)}
        </span>
        {currentPick === homeTeam && homeTeam && <span className="text-brand-yellow text-xs font-bold">✓</span>}
      </div>
      <div className="border-t border-brand-border" />
      {/* Away slot */}
      <div
        onClick={() => {
          if (locked || !awayTeam || isAway3rd) return;
          onPick(awayTeam);
        }}
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
          currentPick === awayTeam && awayTeam ? "bg-brand-yellow/20 border-l-2 border-brand-yellow" : "hover:bg-white/5"
        } ${(!awayTeam || locked) ? "cursor-default" : ""}`}
      >
        <span className="text-base">{awayTeam ? flag(awayTeam) : "🏳"}</span>
        <span className={`text-sm font-medium flex-1 truncate ${awayTeam ? "text-white" : "text-brand-muted"}`}>
          {isAway3rd ? "Best 3rd Qualifier" : (awayTeam || (awaySlot.startsWith("RU:") ? `Group ${awaySlot.split(":")[1]} Runner-up` : awaySlot))}
        </span>
        {currentPick === awayTeam && awayTeam && <span className="text-brand-yellow text-xs font-bold">✓</span>}
      </div>
      {/* 3rd qualifier selectors */}
      {(isHome3rd || isAway3rd) && !locked && thirdCandidates.length > 0 && (
        <div className="border-t border-brand-border px-3 py-2">
          <select
            value={currentPick}
            onChange={(e) => onPick(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-lg px-2 py-1.5 text-white text-xs"
          >
            <option value="">Pick a 3rd-place qualifier...</option>
            {thirdCandidates.map((t) => (
              <option key={t} value={t}>{flag(t)} {t}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function WC2026BracketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [picks, setPicks] = useState<WCPicks>({ ...WC_EMPTY_PICKS });
  const [activeTab, setActiveTab] = useState<"groups" | "r32" | "r16" | "qf" | "final">("groups");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingEntry, setExistingEntry] = useState<string | null>(null);

  const isLocked = new Date() >= WC_LOCK_TIME;
  const { made, total } = wcPickProgress(picks);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/brackets/entry?challengeId=${WC_BRACKET_ID}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.picks) {
          setPicks({ ...WC_EMPTY_PICKS, ...d.picks });
          setExistingEntry(d.id);
        }
      })
      .catch(() => {});
  }, [status]);

  const setGroupPick = useCallback((group: string, team: string) => {
    if (isLocked) return;
    setPicks((prev) => ({
      ...prev,
      groups: { ...prev.groups, [group]: prev.groups[group] === team ? "" : team },
    }));
  }, [isLocked]);

  const setKnockoutPick = useCallback((round: string, id: string, team: string) => {
    if (isLocked || !team) return;
    setPicks((prev) => ({
      ...prev,
      [round]: { ...(prev as any)[round], [id]: (prev as any)[round]?.[id] === team ? "" : team },
    }));
  }, [isLocked]);

  const setChampion = useCallback((team: string) => {
    if (isLocked || !team) return;
    setPicks((prev) => ({ ...prev, champion: prev.champion === team ? "" : team }));
  }, [isLocked]);

  async function handleSave() {
    setSaving(true);
    try {
      const method = existingEntry ? "PUT" : "POST";
      const url = existingEntry ? `/api/brackets/entry/${existingEntry}` : "/api/brackets/entry";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: WC_BRACKET_ID, picks }),
      });
      if (res.ok) {
        const d = await res.json();
        setExistingEntry(d.id ?? existingEntry);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { key: "groups", label: "Groups" },
    { key: "r32",    label: "R32" },
    { key: "r16",    label: "R16" },
    { key: "qf",     label: "QF / SF" },
    { key: "final",  label: "Final" },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 space-y-5">
      {/* Header */}
      <div className="pt-4 space-y-2">
        <Link href="/brackets" className="text-brand-muted text-sm hover:text-white transition-colors">
          Back to Brackets
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div>
            <h1 className="text-xl font-bold text-white">FIFA World Cup 2026</h1>
            <p className="text-brand-muted text-xs">Bracket Challenge · Locks Jun 11</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-brand-surface rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-xs text-brand-muted">
            <span>{made} / {total} picks made</span>
            <span>{Math.round((made / total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all"
              style={{ width: `${(made / total) * 100}%` }}
            />
          </div>
        </div>

        {isLocked && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-red-400 text-sm font-semibold text-center">
            Bracket locked — Jun 11 kickoff
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-brand-card rounded-xl p-1 border border-brand-border overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === key ? "bg-brand-green text-brand-dark" : "text-brand-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Groups tab ─────────────────────────────────────────────────── */}
      {activeTab === "groups" && (
        <div className="space-y-3">
          <p className="text-brand-muted text-xs">Pick the winner of each group.</p>
          <div className="grid grid-cols-1 gap-3">
            {WC_GROUP_KEYS.map((g) => {
              const teams = WC_GROUPS[g];
              const winner = picks.groups[g] ?? "";
              return (
                <div key={g} className="bg-brand-surface border border-brand-border rounded-xl p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2">
                    Group {g}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {teams.map((team) => (
                      <TeamBtn
                        key={team}
                        team={team}
                        selected={winner === team}
                        onSelect={() => setGroupPick(g, team)}
                        disabled={isLocked}
                      />
                    ))}
                  </div>
                  {winner && (
                    <p className="text-xs text-brand-yellow mt-2 font-semibold">
                      {flag(winner)} {winner} to win Group {g}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setActiveTab("r32")}
            className="w-full bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors text-sm"
          >
            Next: Round of 32
          </button>
        </div>
      )}

      {/* ── R32 tab ────────────────────────────────────────────────────── */}
      {activeTab === "r32" && (
        <div className="space-y-3">
          <p className="text-brand-muted text-xs">Pick the winner of each Round of 32 match. Click a team to advance them.</p>
          <div className="grid grid-cols-2 gap-2">
            {WC_R32.map((m) => (
              <div key={m.id} className="space-y-1">
                <p className="text-brand-muted text-xs text-center">{m.date} · M{m.id}</p>
                <MatchCard
                  homeSlot={m.home} awaySlot={m.away}
                  picks={picks} round="r32" matchId={String(m.id)}
                  onPick={(team) => setKnockoutPick("r32", String(m.id), team)}
                  locked={isLocked}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveTab("r16")}
            className="w-full bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors text-sm"
          >
            Next: Round of 16
          </button>
        </div>
      )}

      {/* ── R16 tab ────────────────────────────────────────────────────── */}
      {activeTab === "r16" && (
        <div className="space-y-3">
          <p className="text-brand-muted text-xs">Pick winners through the Round of 16 and Quarterfinals.</p>
          <div className="space-y-2">
            <p className="text-white font-bold text-sm">Round of 16</p>
            <div className="grid grid-cols-2 gap-2">
              {WC_R16.map((m) => (
                <div key={m.id} className="space-y-1">
                  <p className="text-brand-muted text-xs text-center">{m.date} · M{m.id}</p>
                  <MatchCard
                    homeSlot={m.home} awaySlot={m.away}
                    picks={picks} round="r16" matchId={String(m.id)}
                    onPick={(team) => setKnockoutPick("r16", String(m.id), team)}
                    locked={isLocked}
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setActiveTab("qf")}
            className="w-full bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors text-sm"
          >
            Next: Quarterfinals
          </button>
        </div>
      )}

      {/* ── QF/SF tab ─────────────────────────────────────────────────── */}
      {activeTab === "qf" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-white font-bold text-sm">Quarterfinals</p>
            <div className="grid grid-cols-2 gap-2">
              {WC_QF.map((m) => (
                <div key={m.id} className="space-y-1">
                  <p className="text-brand-muted text-xs text-center">{m.date}</p>
                  <MatchCard
                    homeSlot={m.home} awaySlot={m.away}
                    picks={picks} round="qf" matchId={String(m.id)}
                    onPick={(team) => setKnockoutPick("qf", String(m.id), team)}
                    locked={isLocked}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-white font-bold text-sm">Semifinals</p>
            <div className="grid grid-cols-2 gap-2">
              {WC_SF.map((m) => (
                <div key={m.id} className="space-y-1">
                  <p className="text-brand-muted text-xs text-center">{m.date}</p>
                  <MatchCard
                    homeSlot={m.home} awaySlot={m.away}
                    picks={picks} round="sf" matchId={String(m.id)}
                    onPick={(team) => setKnockoutPick("sf", String(m.id), team)}
                    locked={isLocked}
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setActiveTab("final")}
            className="w-full bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors text-sm"
          >
            Next: The Final
          </button>
        </div>
      )}

      {/* ── Final tab ─────────────────────────────────────────────────── */}
      {activeTab === "final" && (
        <div className="space-y-4">
          <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-2xl p-5 space-y-3 text-center">
            <p className="text-brand-yellow font-bold text-xs uppercase tracking-widest">The Final · Jul 19</p>
            <p className="text-white font-bold text-lg">Who lifts the trophy?</p>
            {(() => {
              const sf1 = picks.sf?.["1"] ?? "";
              const sf2 = picks.sf?.["2"] ?? "";
              return (
                <div className="grid grid-cols-2 gap-2">
                  {[sf1, sf2].map((team, i) => (
                    <button
                      key={i}
                      onClick={() => setChampion(team)}
                      disabled={isLocked || !team}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        picks.champion === team && team
                          ? "bg-brand-yellow border-brand-yellow text-brand-dark font-bold"
                          : team
                          ? "border-brand-border hover:border-brand-yellow text-white"
                          : "border-brand-border text-brand-muted cursor-default"
                      }`}
                    >
                      <span className="text-2xl">{team ? flag(team) : "🏳"}</span>
                      <span className="text-xs font-semibold">{team || "TBD"}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
            {picks.champion && (
              <p className="text-brand-yellow text-sm font-bold">
                {flag(picks.champion)} {picks.champion} — Your Champion
              </p>
            )}
          </div>
        </div>
      )}

      {/* Save button */}
      {!isLocked && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving || made === 0}
            className="w-full bg-brand-green text-brand-dark font-bold py-3.5 rounded-xl hover:bg-green-400 transition-colors text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : existingEntry ? "Update Bracket" : "Save Bracket"}
          </button>
        </div>
      )}
    </div>
  );
}
