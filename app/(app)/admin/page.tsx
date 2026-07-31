"use client";

/**
 * /admin — Admin Panel
 *
 * Allows an admin to:
 *  - Trigger parlay resolution manually
 *  - Manage user accounts (reset passwords, delete users)
 */

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UserRow {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  walletBalance: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [log, setLog] = useState<string[]>([]);
  const [resolvingParlays, setResolvingParlays] = useState(false);

  // Users management
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userAction, setUserAction] = useState<string | null>(null);
  const [showUsers, setShowUsers] = useState(false);

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

  // ── Resolve Parlays ────────────────────────────────────────────────────────
  async function handleResolveParlays() {
    setResolvingParlays(true);
    addLog("Triggering parlay resolution…");
    try {
      const res = await fetch("/api/admin/resolve-parlays", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addLog(
          `Parlays resolved: ${data.resolved} | Won: ${data.won} | Lost: ${data.lost} | Refunded: ${data.refunded ?? 0}` +
            (data.errors?.length ? ` | Errors: ${data.errors.join(", ")}` : "")
        );
      } else {
        addLog(`Parlay resolution failed: ${data.error}`);
      }
    } catch (err) {
      addLog(`Error: ${String(err)}`);
    }
    setResolvingParlays(false);
  }

  // ── Loading / auth states ──────────────────────────────────────────────────
  if (status === "loading") {
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
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-gray-400 text-sm mt-1">FunBetz administration</p>
        </div>
        <span className="bg-brand-green/20 text-brand-green text-xs font-medium px-3 py-1 rounded-full border border-brand-green/30">
          Admin
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleResolveParlays}
          disabled={resolvingParlays}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {resolvingParlays ? "Resolving…" : "💰 Resolve Parlays"}
        </button>
      </div>

      {/* Users */}
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
                      <th className="text-left py-2 pr-4">Wallet</th>
                      <th className="text-left py-2 pr-4">Role</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {users.map((u) => {
                      const isActing = userAction === u.id || userAction === `reset-${u.id}`;
                      return (
                        <tr key={u.id} className="text-gray-300">
                          <td className="py-2.5 pr-4 font-medium">{u.username}</td>
                          <td className="py-2.5 pr-4 text-gray-400 text-xs">{u.email}</td>
                          <td className="py-2.5 pr-4">
                            <span className="text-brand-green font-semibold">{u.walletBalance}</span>
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
