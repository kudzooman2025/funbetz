"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const { data: session } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setStatus("error");
      setMessage("New passwords do not match");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong");
      } else {
        setStatus("success");
        setMessage("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto pt-4 pb-24 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Account Settings</h1>
        <p className="text-brand-muted text-sm mt-1">
          Signed in as <span className="text-white font-medium">{session?.user?.username}</span>
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-brand-muted uppercase tracking-widest">
          Change Password
        </h2>

        {status === "success" && (
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg px-4 py-3 text-brand-green text-sm">
            ✓ {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current password"
              className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Same password again"
              className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-green"
            />
          </div>

          {status === "error" && (
            <p className="text-red-400 text-sm">{message}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-brand-green text-brand-dark font-bold py-2.5 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
