"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [tab, setTab] = useState<"password" | "username">("password");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint =
        tab === "password"
          ? "/api/auth/forgot-password"
          : "/api/auth/forgot-username";
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="text-brand-green">Fun</span>
          <span className="text-brand-gold">Betz</span>
        </h1>
        <p className="text-brand-muted mt-2">Account recovery</p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab("password"); setSubmitted(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "password"
                ? "bg-brand-green text-brand-dark"
                : "bg-brand-surface text-brand-muted hover:text-white"
            }`}
          >
            Forgot Password
          </button>
          <button
            onClick={() => { setTab("username"); setSubmitted(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "username"
                ? "bg-brand-green text-brand-dark"
                : "bg-brand-surface text-brand-muted hover:text-white"
            }`}
          >
            Forgot Username
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <p className="text-white font-semibold mb-1">Check your email</p>
            <p className="text-brand-muted text-sm">
              If an account exists for that email address, we&apos;ve sent you{" "}
              {tab === "password" ? "a password reset link" : "your username"}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-brand-muted mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-green"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green text-brand-dark font-bold py-2.5 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-60"
            >
              {loading
                ? "Sending…"
                : tab === "password"
                ? "Send Reset Link"
                : "Email My Username"}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-brand-muted text-sm mt-4">
        Remember your details?{" "}
        <Link href="/login" className="text-brand-green hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
