"use client";

/**
 * /admin — Bracket Results Admin Panel
 *
 * Allows an admin to:
 *  - View current stored results (group winners + knockout winners)
 *  - Trigger a live scrape from modular11.com
 *  - Manually enter/override QF, SF, and Final winners
 *  - Recalculate all bracket scores
 */

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GROUPS, QF_SLOTS, SF_SEEDS } from "@/lib/bracket-config";

const CHALLENGE_ID = "va26-u13-ad";

interface ResultRow {
  id: string;
  round: string;
  key: string;
  winner: string;
  source: string;
  updatedAt: string;
}

// All teams in tournament, grouped for convenient dropdowns
const ALL_TEAMS = Object.values(GROUPS).flat();

// QF teams can come from any group (seed-based, not adjacent-group-based)
function teamsForQF(_seedKey: string): string[] {
  return ALL_TEAMS;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [pendingKO, setPendingKO] = useState<Record<string, string>>({});

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && !session?.user?.isAdmin) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // ── Load results ───────────────────────────────────────────────────────────
  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/bracket-results?challengeId=${CHALLENGE_ID}`
      );
      if (res.ok) {
        const data: ResultRow[] = await res.json();
        setResults(data);
        // Pre-fill pending selects from stored values
        const ko: Record<string, string> = {};
        for (const r of data) {
          if (["qf", "sf", "final", "qf_home", "qf_away", "sf_home", "sf_away", "final_home", "final_away"].includes(r.round)) {
            ko[`${r.round}_${r.key}`] = r.winner;
          }
        }
        setPendingKO(ko);
      }
    } catch {
      addLog("Failed to load results");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.isAdmin) {
      loadResults();
    }
  }, [status, session, loadResults]);

  function addLog(msg: string) {
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 49),
    ]);
  }

  // ── Scrape ─────────────────────────────────────────────────────────────────
  async function handleScrape() {
    setScraping(true);
    addLog("Scraping modular11.com…");
    try {
      const res = await fetch(
        `/api/admin/scrape?challengeId=${CHALLENGE_ID}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.saved?.length) {
        addLog(`Saved: ${(data.saved as string[]).join(", ")}`);
      }
      if (data.skipped?.length) {
        addLog(`Skipped (manual): ${(data.skipped as string[]).join(", ")}`);
      }
      if (data.errors?.length) {
        addLog(`Scrape errors: ${(data.errors as string[]).join(" | ")}`);
      }
      if (!data.saved?.length && !data.errors?.length) {
        addLog("No new results found (matches may not be complete yet)");
      }
      await loadResults();
    } catch (err) {
      addLog(`Scrape failed: ${String(err)}`);
    }
    setScraping(false);
  }

  // ── Manual save ────────────────────────────────────────────────────────────
  async function saveResult(round: string, key: string) {
    const stateKey = `${round}_${key}`;
    const winner = pendingKO[stateKey];
    if (!winner) return;

    setSaving(stateKey);
    try {
      const res = await fetch("/api/admin/bracket-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: CHALLENGE_ID, round, key, winner }),
      });
      if (res.ok) {
        addLog(`Saved ${round}/${key} → ${winner} (manual)`);
        await loadResults();
      } else {
        addLog(`Failed to save ${round}/${key}`);
      }
    } catch (err) {
      addLog(`Error: ${String(err)}`);
    }
    setSaving(null);
  }

  // ── Clear result ───────────────────────────────────────────────────────────
  async function clearResult(round: string, key: string) {
    try {
      await fetch("/api/admin/bracket-results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: CHALLENGE_ID, round, key }),
      });
      addLog(`Cleared ${round}/${key}`);
      await loadResults();
    } catch (err) {
      addLog(`Clear failed: ${String(err)}`);
    }
  }

  // ── Matchup save/clear helpers ────────────────────────────────────────────
  async function saveMatchup(homeRound: string, awayRound: string, key: string) {
    await saveResult(homeRound, key);
    await saveResult(awayRound, key);
  }

  async function clearMatchup(homeRound: string, awayRound: string, key: string) {
    await clearResult(homeRound, key);
    await clearResult(awayRound, key);
  }

  // ── Recalculate scores ─────────────────────────────────────────────────────
  async function handleRecalculate() {
    setRecalculating(true);
    addLog("Recalculating all scores…");
    try {
      const res = await fetch(
        `/api/admin/recalculate?challengeId=${CHALLENGE_ID}`,
        { method: "POST" }
      );
      const data = await res.json();
      addLog(
        `Scores updated: ${data.updated}/${data.total} entries changed` +
          (data.errors?.length ? ` | Errors: ${(data.errors as string[]).join(", ")}` : "")
      );
    } catch (err) {
      addLog(`Recalculate failed: ${String(err)}`);
    }
    setRecalculating(false);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function storedWinner(round: string, key: string): ResultRow | undefined {
    return results.find((r) => r.round === round && r.key === key);
  }

  // ── Loading / auth states ──────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!session?.user?.isAdmin) return null;

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bracket Admin</h1>
          <p className="text-gray-400 text-sm mt-1">VA26 U13 AD — MLS NEXT</p>
        </div>
        <span className="bg-brand-green/20 text-brand-green text-xs font-medium px-3 py-1 rounded-full border border-brand-green/30">
          Admin
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {scraping ? "Syncing…" : "🔄 Sync from modular11"}
        </button>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="px-4 py-2 bg-brand-green hover:bg-green-500 disabled:opacity-50 text-black text-sm font-medium rounded-lg transition-colors"
        >
          {recalculating ? "Calculating…" : "📊 Recalculate Scores"}
        </button>
        <a
          href={`/brackets/${CHALLENGE_ID}/leaderboard`}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🏆 View Leaderboard
        </a>
      </div>

      {/* Group Winners (read-only — set by scraper) */}
      <section className="bg-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-white">
          Group Winners
          <span className="text-xs text-gray-400 font-normal ml-2">
            (auto-synced from modular11)
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["A","B","C","D","E","F","G","H"].map((g) => {
            const first = storedWinner("group", g);
            const second = storedWinner("group2", g);
            return (
              <div key={g} className="bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium mb-1">Group {g}</p>
                {first ? (
                  <>
                    <p className="text-white text-sm font-semibold truncate">🥇 {first.winner}</p>
                    {second && (
                      <p className="text-gray-300 text-xs truncate mt-0.5">🥈 {second.winner}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      via {first.source}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm italic">Not set</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* QF Matchup Setup */}
      <MatchupSection
        title="QF Matchups"
        subtitle="Set which two teams play in each QF slot"
        slots={QF_SLOTS.map((s) => ({
          key: String(s.id),
          label: `QF Slot ${s.id}: ${s.label}`,
          homeRound: "qf_home",
          awayRound: "qf_away",
        }))}
        teams={ALL_TEAMS}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveMatchup}
        onClear={clearMatchup}
      />

      {/* SF Matchup Setup */}
      <MatchupSection
        title="SF Matchups"
        subtitle="Set which two teams play in each SF slot"
        slots={SF_SEEDS.map((s) => ({
          key: String(s.id),
          label: `SF ${s.id}: Winner QF${s.homeQF} vs Winner QF${s.awayQF}`,
          homeRound: "sf_home",
          awayRound: "sf_away",
        }))}
        teams={ALL_TEAMS}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveMatchup}
        onClear={clearMatchup}
      />

      {/* Final Matchup Setup */}
      <MatchupSection
        title="Final Matchup"
        subtitle="Set which two teams play in the Final"
        slots={[{
          key: "1",
          label: "Championship Final",
          homeRound: "final_home",
          awayRound: "final_away",
        }]}
        teams={ALL_TEAMS}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveMatchup}
        onClear={clearMatchup}
      />

      {/* Quarterfinals */}
      <KnockoutSection
        title="Quarterfinals"
        seeds={QF_SLOTS.map((s) => ({
          round: "qf",
          key: String(s.id),
          label: `QF ${s.id}: ${s.label}`,
          teams: teamsForQF(String(s.id)),
        }))}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveResult}
        onClear={clearResult}
      />

      {/* Semifinals */}
      <KnockoutSection
        title="Semifinals"
        seeds={SF_SEEDS.map((s) => ({
          round: "sf",
          key: String(s.id),
          label: `SF ${s.id}: Winner QF${s.homeQF} vs Winner QF${s.awayQF}`,
          teams: ALL_TEAMS,
        }))}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveResult}
        onClear={clearResult}
      />

      {/* Final */}
      <KnockoutSection
        title="Final"
        seeds={[{
          round: "final",
          key: "1",
          label: "Championship Final",
          teams: ALL_TEAMS,
        }]}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveResult}
        onClear={clearResult}
      />

      {/* Activity Log */}
      {log.length > 0 && (
        <section className="bg-gray-900 rounded-xl p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Activity Log</h2>
          {log.map((entry, i) => (
            <p key={i} className="text-xs text-gray-300 font-mono">
              {entry}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

// ── MatchupSection component ─────────────────────────────────────────────────

interface MatchupSlot {
  key: string;
  label: string;
  homeRound: string;
  awayRound: string;
}

function MatchupSection({
  title,
  subtitle,
  slots,
  teams,
  pending,
  setPending,
  storedWinner,
  saving,
  onSave,
  onClear,
}: {
  title: string;
  subtitle: string;
  slots: MatchupSlot[];
  teams: string[];
  pending: Record<string, string>;
  setPending: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  storedWinner: (round: string, key: string) => ResultRow | undefined;
  saving: string | null;
  onSave: (homeRound: string, awayRound: string, key: string) => Promise<void>;
  onClear: (homeRound: string, awayRound: string, key: string) => Promise<void>;
}) {
  return (
    <section className="bg-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {slots.map(({ key, label, homeRound, awayRound }) => {
          const homeStateKey = `${homeRound}_${key}`;
          const awayStateKey = `${awayRound}_${key}`;
          const storedHome = storedWinner(homeRound, key);
          const storedAway = storedWinner(awayRound, key);
          const isSaving = saving === homeStateKey || saving === awayStateKey;
          const canSave = !!pending[homeStateKey] && !!pending[awayStateKey];

          return (
            <div key={key} className="bg-gray-900 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-300 font-medium">{label}</p>
              {storedHome && storedAway && (
                <p className="text-xs text-brand-green">
                  Current: <span className="font-semibold">{storedHome.winner}</span>
                  {" vs "}
                  <span className="font-semibold">{storedAway.winner}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pending[homeStateKey] ?? ""}
                  onChange={(e) => setPending((p) => ({ ...p, [homeStateKey]: e.target.value }))}
                  className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-brand-green focus:outline-none min-w-[190px]"
                >
                  <option value="">— Team 1 —</option>
                  {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-gray-500 text-sm font-medium">vs</span>
                <select
                  value={pending[awayStateKey] ?? ""}
                  onChange={(e) => setPending((p) => ({ ...p, [awayStateKey]: e.target.value }))}
                  className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-brand-green focus:outline-none min-w-[190px]"
                >
                  <option value="">— Team 2 —</option>
                  {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  onClick={() => onSave(homeRound, awayRound, key)}
                  disabled={!canSave || isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  {isSaving ? "Saving…" : "Save Matchup"}
                </button>
                {(storedHome || storedAway) && (
                  <button
                    onClick={() => onClear(homeRound, awayRound, key)}
                    className="px-3 py-2 text-gray-400 hover:text-red-400 text-sm transition-colors"
                    title="Clear matchup"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── KnockoutSection component ────────────────────────────────────────────────

interface SeedDef {
  round: string;
  key: string;
  label: string;
  teams: string[];
}

function KnockoutSection({
  title,
  seeds,
  pending,
  setPending,
  storedWinner,
  saving,
  onSave,
  onClear,
}: {
  title: string;
  seeds: SeedDef[];
  pending: Record<string, string>;
  setPending: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  storedWinner: (round: string, key: string) => ResultRow | undefined;
  saving: string | null;
  onSave: (round: string, key: string) => Promise<void>;
  onClear: (round: string, key: string) => Promise<void>;
}) {
  return (
    <section className="bg-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-3">
        {seeds.map(({ round, key, label, teams }) => {
          const stateKey = `${round}_${key}`;
          const stored = storedWinner(round, key);
          const isSaving = saving === stateKey;
          const selected = pending[stateKey] ?? "";

          return (
            <div
              key={stateKey}
              className="bg-gray-900 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 font-medium">{label}</p>
                {stored && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Current:{" "}
                    <span className="text-brand-green font-semibold">
                      {stored.winner}
                    </span>{" "}
                    <span className="text-gray-600">({stored.source})</span>
                  </p>
                )}
              </div>

              {/* Select */}
              <select
                value={selected}
                onChange={(e) =>
                  setPending((p) => ({ ...p, [stateKey]: e.target.value }))
                }
                className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-brand-green focus:outline-none min-w-[200px]"
              >
                <option value="">— select winner —</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Save button */}
              <button
                onClick={() => onSave(round, key)}
                disabled={!selected || isSaving}
                className="px-4 py-2 bg-brand-green hover:bg-green-500 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>

              {/* Clear */}
              {stored && (
                <button
                  onClick={() => onClear(round, key)}
                  className="px-3 py-2 text-gray-400 hover:text-red-400 text-sm transition-colors"
                  title="Clear this result"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
