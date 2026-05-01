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
import { GROUPS, GROUP_GAMES, QF_SLOTS, SF_SEEDS, GROUP_KEYS, type BracketPicks } from "@/lib/bracket-config";
import { DERBY_HORSES } from "@/lib/derby-config";

const CHALLENGE_ID = "va26-u13-ad";

interface ResultRow {
  id: string;
  round: string;
  key: string;
  winner: string;
  source: string;
  updatedAt: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  walletBalance: number;
  bracketEntries: { score: number }[];
}

interface BracketEntry {
  rank: number;
  userId: string;
  username: string;
  email: string;
  score: number;
  picks: BracketPicks;
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

  // Users management
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userAction, setUserAction] = useState<string | null>(null);
  const [showUsers, setShowUsers] = useState(false);

  // User brackets
  const [bracketEntries, setBracketEntries] = useState<BracketEntry[]>([]);
  const [bracketsLoading, setBracketsLoading] = useState(false);
  const [showBrackets, setShowBrackets] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Derby
  const [showDerby, setShowDerby] = useState(false);
  const [derbyFirst, setDerbyFirst] = useState("");
  const [derbySecond, setDerbySecond] = useState("");
  const [derbyThird, setDerbyThird] = useState("");
  const [derbySettling, setDerbySettling] = useState(false);
  const [derbyResult, setDerbyResult] = useState<{ settled: number; totalPaidOut: number; first: string; second: string; third: string } | null>(null);

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
          if (["qf", "sf", "final", "qf_home", "qf_away", "sf_home", "sf_away", "final_home", "final_away", "group_score", "qf_score", "sf_score", "final_score"].includes(r.round)) {
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

  // ── Users ──────────────────────────────────────────────────────────────────
  async function loadUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {
      addLog("Failed to load users");
    }
    setUsersLoading(false);
  }

  async function handleDeleteUser(userId: string, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setUserAction(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        addLog(`Deleted user: ${username}`);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        addLog(`Failed to delete ${username}: ${data.error}`);
      }
    } catch (err) {
      addLog(`Error: ${String(err)}`);
    }
    setUserAction(null);
  }

  async function handleResetPassword(userId: string, username: string) {
    if (!confirm(`Reset password for "${username}"? A temporary password will be emailed to them.`)) return;
    setUserAction(`reset-${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.emailSent) {
          addLog(`Password reset email sent to ${username}`);
        } else {
          addLog(`Password reset for ${username} — email failed. Temp password: ${data.tempPassword}`);
          alert(`Temp password for ${username}: ${data.tempPassword}\n(Email failed to send)`);
        }
      } else {
        addLog(`Failed to reset password for ${username}: ${data.error}`);
      }
    } catch (err) {
      addLog(`Error: ${String(err)}`);
    }
    setUserAction(null);
  }

  // ── Bracket entries ───────────────────────────────────────────────────────
  async function loadBracketEntries() {
    setBracketsLoading(true);
    try {
      const res = await fetch(`/api/admin/bracket-entries?challengeId=${CHALLENGE_ID}`);
      if (res.ok) {
        const data = await res.json();
        setBracketEntries(data);
      }
    } catch {
      addLog("Failed to load bracket entries");
    }
    setBracketsLoading(false);
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

  // ── Derby settle ──────────────────────────────────────────────────────────
  async function handleDerbySettle() {
    if (!derbyFirst || !derbySecond || !derbyThird) {
      addLog("Derby: select all three finishers first");
      return;
    }
    if (derbyFirst === derbySecond || derbyFirst === derbyThird || derbySecond === derbyThird) {
      addLog("Derby: 1st, 2nd, and 3rd must all be different horses");
      return;
    }
    if (!confirm(`Settle Kentucky Derby with:\n1st: ${derbyFirst}\n2nd: ${derbySecond}\n3rd: ${derbyThird}\n\nThis will credit all winners. Continue?`)) return;

    setDerbySettling(true);
    addLog(`Derby: submitting results — 1st: ${derbyFirst}, 2nd: ${derbySecond}, 3rd: ${derbyThird}`);
    try {
      const res = await fetch("/api/admin/derby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first: derbyFirst, second: derbySecond, third: derbyThird }),
      });
      const data = await res.json();
      if (res.ok) {
        setDerbyResult(data);
        addLog(`Derby settled! ${data.settled} picks settled, $${data.totalPaidOut.toLocaleString()} paid out.`);
      } else {
        addLog(`Derby error: ${data.error}`);
      }
    } catch (err) {
      addLog(`Derby failed: ${String(err)}`);
    }
    setDerbySettling(false);
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

      {/* Group Play Scores */}
      <GroupScoreSection
        games={GROUP_GAMES}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveResult}
        onClear={clearResult}
      />

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

      {/* Actual Scores */}
      <ScoreSection
        title="Actual Scores"
        subtitle="Enter final scores to award exact-score bonus points (+1 each)"
        slots={[
          ...QF_SLOTS.map((s) => ({ key: String(s.id), label: `QF ${s.id}`, round: "qf_score" })),
          ...SF_SEEDS.map((s) => ({ key: String(s.id), label: `SF ${s.id}`, round: "sf_score" })),
          { key: "1", label: "Final", round: "final_score" },
        ]}
        pending={pendingKO}
        setPending={setPendingKO}
        storedWinner={storedWinner}
        saving={saving}
        onSave={saveResult}
        onClear={clearResult}
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

      {/* User Brackets */}
      <UserBracketsSection
        entries={bracketEntries}
        loading={bracketsLoading}
        show={showBrackets}
        expandedEntry={expandedEntry}
        setExpandedEntry={setExpandedEntry}
        onToggle={() => {
          setShowBrackets(!showBrackets);
          if (!showBrackets) loadBracketEntries();
        }}
      />

      {/* Users Management */}
      <section className="bg-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Users</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage accounts — delete or reset passwords</p>
          </div>
          <button
            onClick={() => { setShowUsers(!showUsers); if (!showUsers) loadUsers(); }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {showUsers ? "Hide" : "Show Users"}
          </button>
        </div>

        {showUsers && (
          <>
            {usersLoading ? (
              <p className="text-gray-400 text-sm">Loading users…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                      <th className="text-left py-2 pr-4">Username</th>
                      <th className="text-left py-2 pr-4">Email</th>
                      <th className="text-left py-2 pr-4">Bracket Score</th>
                      <th className="text-left py-2 pr-4">Role</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {users.map((u) => {
                      const bracketScore = u.bracketEntries[0]?.score ?? 0;
                      const isActing = userAction === u.id || userAction === `reset-${u.id}`;
                      return (
                        <tr key={u.id} className="text-gray-300">
                          <td className="py-2.5 pr-4 font-medium">{u.username}</td>
                          <td className="py-2.5 pr-4 text-gray-400 text-xs">{u.email}</td>
                          <td className="py-2.5 pr-4">
                            <span className="text-brand-green font-semibold">{bracketScore}</span>
                          </td>
                          <td className="py-2.5 pr-4">
                            {u.isAdmin ? (
                              <span className="text-brand-gold text-xs font-semibold">Admin</span>
                            ) : (
                              <span className="text-gray-500 text-xs">User</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleResetPassword(u.id, u.username)}
                                disabled={isActing}
                                className="px-3 py-1 bg-yellow-600/80 hover:bg-yellow-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                                title="Reset password"
                              >
                                {userAction === `reset-${u.id}` ? "…" : "Reset PW"}
                              </button>
                              {!u.isAdmin && (
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  disabled={isActing}
                                  className="px-3 py-1 bg-red-700/80 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                                  title="Delete user"
                                >
                                  {userAction === u.id ? "…" : "Delete"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No users found</p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Kentucky Derby Section ─────────────────────────────────────────── */}
      <section className="bg-brand-card border border-brand-gold/30 rounded-xl p-6">
        <button
          onClick={() => setShowDerby(!showDerby)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-bold text-brand-gold">🏇 Kentucky Derby 2026 — Enter Results</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manual fallback: select 1st, 2nd, 3rd place finishers and settle all picks</p>
          </div>
          <span className="text-gray-400 text-sm">{showDerby ? "▲" : "▼"}</span>
        </button>

        {showDerby && (
          <div className="mt-5 space-y-5">
            {derbyResult ? (
              <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4 text-center">
                <p className="text-brand-green font-bold text-lg">✅ Derby Settled!</p>
                <p className="text-gray-300 text-sm mt-1">
                  1st: <span className="text-brand-gold font-semibold">{derbyResult.first}</span>{" · "}
                  2nd: <span className="text-brand-gold font-semibold">{derbyResult.second}</span>{" · "}
                  3rd: <span className="text-brand-gold font-semibold">{derbyResult.third}</span>
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {derbyResult.settled} picks settled · ${derbyResult.totalPaidOut.toLocaleString()} paid out
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    { label: "🥇 1st Place", value: derbyFirst, setter: setDerbyFirst },
                    { label: "🥈 2nd Place", value: derbySecond, setter: setDerbySecond },
                    { label: "🥉 3rd Place", value: derbyThird, setter: setDerbyThird },
                  ] as { label: string; value: string; setter: (v: string) => void }[]).map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
                      <select
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-gold"
                      >
                        <option value="">— Select horse —</option>
                        {DERBY_HORSES.map((h) => (
                          <option key={h.name} value={h.name}>
                            #{h.post} {h.name} ({h.odds})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {derbyFirst && derbySecond && derbyThird && (
                  <div className="bg-brand-surface rounded-lg p-3 text-sm text-gray-300 border border-brand-border">
                    <span className="text-gray-400">Ready to settle: </span>
                    <span className="text-brand-gold font-semibold">{derbyFirst}</span>
                    <span className="text-gray-500"> → </span>
                    <span className="text-brand-gold font-semibold">{derbySecond}</span>
                    <span className="text-gray-500"> → </span>
                    <span className="text-brand-gold font-semibold">{derbyThird}</span>
                  </div>
                )}

                <button
                  onClick={handleDerbySettle}
                  disabled={derbySettling || !derbyFirst || !derbySecond || !derbyThird}
                  className="w-full py-3 rounded-lg font-bold text-sm bg-brand-gold text-black hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {derbySettling ? "Settling picks…" : "💰 Enter Results & Settle All Picks"}
                </button>
              </>
            )}
          </div>
        )}
      </section>

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

// ── GroupScoreSection component ──────────────────────────────────────────────

import { GroupGame } from "@/lib/bracket-config";

const CHALLENGE_ID_CONST = "va26-u13-ad";

function GroupScoreSection({
  games,
  pending,
  setPending,
  storedWinner,
  saving,
  onSave,
  onClear,
}: {
  games: GroupGame[];
  pending: Record<string, string>;
  setPending: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  storedWinner: (round: string, key: string) => ResultRow | undefined;
  saving: string | null;
  onSave: (round: string, key: string) => Promise<void>;
  onClear: (round: string, key: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [activeDay, setActiveDay] = useState<1 | 2>(1);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const dayGames = games.filter((g) => g.day === activeDay);
  const byGroup: Record<string, GroupGame[]> = {};
  for (const g of dayGames) {
    if (!byGroup[g.group]) byGroup[g.group] = [];
    byGroup[g.group].push(g);
  }

  const savedCount = games.filter((g) => storedWinner("group_score", String(g.id))).length;

  const getVal = (gameId: number) => {
    const stateKey = `group_score_${gameId}`;
    const stored = storedWinner("group_score", String(gameId));
    return pending[stateKey] ?? stored?.winner ?? "";
  };

  const setScore = (gameId: number, home: string, away: string) => {
    setPending((p) => ({ ...p, [`group_score_${gameId}`]: `${home}-${away}` }));
  };

  async function saveGroup(groupLetter: string) {
    setSavingGroup(groupLetter);
    const groupGames = byGroup[groupLetter] ?? [];
    const toSave = groupGames
      .map((g) => {
        const val = getVal(g.id);
        const parts = val.split("-");
        if (parts[0] !== "" && parts[1] !== "" && parts.length >= 2) {
          return { round: "group_score", key: String(g.id), winner: val };
        }
        return null;
      })
      .filter(Boolean) as { round: string; key: string; winner: string }[];

    if (toSave.length === 0) { setSavingGroup(null); return; }

    try {
      await fetch("/api/admin/bracket-results", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: CHALLENGE_ID_CONST, results: toSave }),
      });
      // Reload results
      await onSave("group_score", toSave[0].key); // trigger parent reload via single save
    } catch { /* ignore */ }
    setSavingGroup(null);
  }

  async function saveAllDay() {
    setSavingAll(true);
    const toSave = dayGames
      .map((g) => {
        const val = getVal(g.id);
        const parts = val.split("-");
        if (parts[0] !== "" && parts[1] !== "" && parts.length >= 2) {
          return { round: "group_score", key: String(g.id), winner: val };
        }
        return null;
      })
      .filter(Boolean) as { round: string; key: string; winner: string }[];

    if (toSave.length > 0) {
      try {
        await fetch("/api/admin/bracket-results", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: CHALLENGE_ID_CONST, results: toSave }),
        });
        await onSave("group_score", toSave[0].key);
      } catch { /* ignore */ }
    }
    setSavingAll(false);
  }

  return (
    <section className="bg-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Group Play Scores
            {savedCount > 0 && (
              <span className="ml-2 text-xs text-brand-green font-normal">
                {savedCount}/{games.length} saved
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Enter scores for all group stage games. Tab between fields.</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {open ? "Collapse" : "Enter Scores"}
        </button>
      </div>

      {open && (
        <>
          {/* Day tabs + Save All */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {([1, 2] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDay(d)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeDay === d
                      ? "bg-brand-green text-black"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {d === 1 ? "📅 May 1 (Friday)" : "📅 May 2 (Saturday)"}
                </button>
              ))}
            </div>
            <button
              onClick={saveAllDay}
              disabled={savingAll}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              {savingAll ? "Saving…" : "💾 Save All"}
            </button>
          </div>

          {/* Groups */}
          <div className="space-y-5">
            {Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupGames]) => {
              const groupSaved = groupGames.filter((g) => storedWinner("group_score", String(g.id))).length;
              return (
                <div key={group}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Group {group}
                      {groupSaved > 0 && (
                        <span className="ml-2 text-brand-green normal-case font-normal">
                          {groupSaved}/{groupGames.length} saved
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => saveGroup(group)}
                      disabled={savingGroup === group}
                      className="px-3 py-1 bg-brand-green hover:bg-green-500 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-colors"
                    >
                      {savingGroup === group ? "Saving…" : "Save Group"}
                    </button>
                  </div>

                  {/* Compact table */}
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        {groupGames.map((game, i) => {
                          const stateKey = `group_score_${game.id}`;
                          const stored = storedWinner("group_score", String(game.id));
                          const val = pending[stateKey] ?? stored?.winner ?? "";
                          const parts = val.split("-");
                          const homeVal = parts[0] ?? "";
                          const awayVal = parts[1] ?? "";
                          const isSaved = !!stored;

                          return (
                            <tr key={game.id} className={`border-t border-gray-800 ${i === 0 ? "border-t-0" : ""}`}>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap w-16">{game.time}</td>
                              <td className="px-2 py-2 text-gray-300 text-right max-w-[120px] truncate">{game.home}</td>
                              <td className="px-1 py-2 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number" min="0" max="20"
                                    value={homeVal}
                                    onChange={(e) => setScore(game.id, e.target.value, awayVal)}
                                    placeholder="–"
                                    className="w-9 text-center bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white focus:border-brand-green focus:outline-none"
                                  />
                                  <span className="text-gray-500 font-bold">-</span>
                                  <input
                                    type="number" min="0" max="20"
                                    value={awayVal}
                                    onChange={(e) => setScore(game.id, homeVal, e.target.value)}
                                    placeholder="–"
                                    className="w-9 text-center bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white focus:border-brand-green focus:outline-none"
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-2 text-gray-300 max-w-[120px] truncate">{game.away}</td>
                              <td className="px-3 py-2 w-8 text-center">
                                {isSaved ? (
                                  <span className="text-brand-green">✓</span>
                                ) : (
                                  <span className="text-gray-700">·</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
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

// ── ScoreSection component ───────────────────────────────────────────────────

interface ScoreSlot { key: string; label: string; round: string; }

function ScoreSection({
  title, subtitle, slots, pending, setPending, storedWinner, saving, onSave, onClear,
}: {
  title: string;
  subtitle: string;
  slots: ScoreSlot[];
  pending: Record<string, string>;
  setPending: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  storedWinner: (round: string, key: string) => ResultRow | undefined;
  saving: string | null;
  onSave: (round: string, key: string) => Promise<void>;
  onClear: (round: string, key: string) => Promise<void>;
}) {
  return (
    <section className="bg-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slots.map(({ key, label, round }) => {
          const stateKey = `${round}_${key}`;
          const stored = storedWinner(round, key);
          const isSaving = saving === stateKey;
          // score stored as "home-away" string e.g. "2-1"
          const val = pending[stateKey] ?? stored?.winner ?? "";
          const parts = val.split("-");
          const homeVal = parts[0] ?? "";
          const awayVal = parts[1] ?? "";

          const setScore = (h: string, a: string) => {
            setPending((p) => ({ ...p, [stateKey]: `${h}-${a}` }));
          };

          return (
            <div key={stateKey} className="bg-gray-900 rounded-lg p-3 space-y-2">
              <p className="text-sm text-gray-300 font-medium">{label}</p>
              {stored && (
                <p className="text-xs text-brand-green">Saved: <span className="font-bold">{stored.winner}</span></p>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min="0" max="20"
                  value={homeVal}
                  onChange={(e) => setScore(e.target.value, awayVal)}
                  placeholder="0"
                  className="w-10 text-center text-sm bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white focus:border-brand-green focus:outline-none"
                />
                <span className="text-gray-400 font-bold">–</span>
                <input
                  type="number" min="0" max="20"
                  value={awayVal}
                  onChange={(e) => setScore(homeVal, e.target.value)}
                  placeholder="0"
                  className="w-10 text-center text-sm bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white focus:border-brand-green focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSave(round, key)}
                  disabled={!homeVal || !awayVal || isSaving}
                  className="px-3 py-1 bg-brand-green hover:bg-green-500 disabled:opacity-40 text-black text-xs font-semibold rounded-lg transition-colors"
                >
                  {isSaving ? "…" : "Save"}
                </button>
                {stored && (
                  <button
                    onClick={() => onClear(round, key)}
                    className="px-2 py-1 text-gray-400 hover:text-red-400 text-xs transition-colors"
                  >✕</button>
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

// ── UserBracketsSection component ────────────────────────────────────────────

function UserBracketsSection({
  entries,
  loading,
  show,
  expandedEntry,
  setExpandedEntry,
  onToggle,
}: {
  entries: BracketEntry[];
  loading: boolean;
  show: boolean;
  expandedEntry: string | null;
  setExpandedEntry: (id: string | null) => void;
  onToggle: () => void;
}) {
  return (
    <section className="bg-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">User Brackets</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            View every user&apos;s picks — group winners, QF, SF, and Final
          </p>
        </div>
        <button
          onClick={onToggle}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {show ? "Hide" : `Show Brackets${entries.length ? ` (${entries.length})` : ""}`}
        </button>
      </div>

      {show && (
        <>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading entries…</p>
          ) : entries.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No bracket entries yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const isOpen = expandedEntry === entry.userId;
                const picks = entry.picks as BracketPicks;
                const groupWinners = GROUP_KEYS.map((g) => ({
                  group: g,
                  team: picks?.groups?.[g]?.first || "—",
                }));
                const qfPicks = QF_SLOTS.map((s) => ({
                  label: `QF${s.id} (${s.homeGroup}/${s.awayGroup})`,
                  team: picks?.qf?.[String(s.id)] || "—",
                }));
                const sfPicks = [
                  { label: "SF 1", team: picks?.sf?.["1"] || "—" },
                  { label: "SF 2", team: picks?.sf?.["2"] || "—" },
                ];
                const finalPick = picks?.final || "—";

                return (
                  <div key={entry.userId} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
                    {/* Row header */}
                    <button
                      onClick={() => setExpandedEntry(isOpen ? null : entry.userId)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-brand-gold font-bold text-sm w-6">#{entry.rank}</span>
                        <div>
                          <p className="text-white font-semibold text-sm">{entry.username}</p>
                          <p className="text-gray-500 text-xs">{entry.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-brand-green font-bold">{entry.score} pts</span>
                        <span className="text-gray-500 text-xs">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded picks */}
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-4">

                        {/* Group Winners */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Group Winners</p>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {groupWinners.map(({ group, team }) => (
                              <div key={group} className="bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-brand-gold text-[10px] font-bold mb-1">Grp {group}</p>
                                <p className={`text-xs truncate ${team === "—" ? "text-gray-600 italic" : "text-white"}`}>
                                  {team === "—" ? "none" : team.split(" ")[0]}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* QF Picks */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Quarterfinals</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {qfPicks.map(({ label, team }) => (
                              <div key={label} className="bg-gray-800 rounded-lg p-2">
                                <p className="text-gray-500 text-[10px] mb-1">{label}</p>
                                <p className={`text-xs font-semibold truncate ${team === "—" ? "text-gray-600 italic" : "text-brand-green"}`}>
                                  {team === "—" ? "not picked" : team}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SF + Final */}
                        <div className="grid grid-cols-3 gap-2">
                          {sfPicks.map(({ label, team }) => (
                            <div key={label} className="bg-gray-800 rounded-lg p-2">
                              <p className="text-gray-500 text-[10px] mb-1">{label}</p>
                              <p className={`text-xs font-semibold truncate ${team === "—" ? "text-gray-600 italic" : "text-blue-400"}`}>
                                {team === "—" ? "not picked" : team}
                              </p>
                            </div>
                          ))}
                          <div className="bg-gray-800 rounded-lg p-2 border border-brand-gold/30">
                            <p className="text-gray-500 text-[10px] mb-1">🏆 Champion</p>
                            <p className={`text-xs font-bold truncate ${finalPick === "—" ? "text-gray-600 italic" : "text-brand-gold"}`}>
                              {finalPick === "—" ? "not picked" : finalPick}
                            </p>
                          </div>
                        </div>

                        <p className="text-gray-600 text-[10px] text-right">
                          Last saved: {new Date(entry.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
