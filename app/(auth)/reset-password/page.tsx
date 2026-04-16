"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Missing or invalid reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg("Passwords do not match");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? "Something went wrong");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-white font-semibold mb-1">Password updated!</p>
        <p className="text-brand-muted text-sm mb-4">
          You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-block bg-brand-green text-brand-dark font-bold px-6 py-2.5 rounded-lg hover:bg-green-400 transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-brand-muted mb-1">
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="At least 6 characters"
          className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-green"
        />
      </div>
      <div>
        <label className="block text-sm text-brand-muted mb-1">
          Confirm new password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Same password again"
          className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-green"
        />
      </div>
      {(status === "error" || errorMsg) && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading" || !token}
        className="w-full bg-brand-green text-brand-dark font-bold py-2.5 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "Updating…" : "Set New Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="text-brand-green">Fun</span>
          <span className="text-brand-gold">Betz</span>
        </h1>
        <p className="text-brand-muted mt-2">Set a new password</p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-6">
        <Suspense fallback={<p className="text-brand-muted text-sm">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>

      <p className="text-center text-brand-muted text-sm mt-4">
        <Link href="/forgot-password" className="text-brand-green hover:underline">
          Request a new reset link
        </Link>
      </p>
    </div>
  );
}
