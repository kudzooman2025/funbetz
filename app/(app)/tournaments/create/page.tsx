"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LEAGUES, LEAGUE_KEYS } from "@/lib/constants";

export default function CreateTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleSport(sport: string) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selectedSports.length === 0) {
      setError("Select at least one sport.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, startDate, endDate, sports: selectedSports }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create tournament.");
      } else {
        router.push(`/tournaments/${data.tournament.id}`);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Default dates: today → 30 days from now
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tournaments" className="text-brand-muted hover:text-white transition-colors text-sm">
          ← Tournaments
        </Link>
        <span className="text-brand-border">/</span>
        <h1 className="text-2xl font-bold">Create Tournament</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Tournament Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Office Bracket 2026"
            required
            minLength={3}
            maxLength={50}
            className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green"
          />
        </div>

        {/* Description (optional) */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Description <span className="text-brand-muted font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Friendly notes for your group…"
            maxLength={200}
            rows={2}
            className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green resize-none"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              required
              className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              required
              className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green"
            />
          </div>
        </div>

        {/* Sports */}
        <div>
          <label className="block text-sm font-medium mb-2">Sports to Include</label>
          <div className="grid grid-cols-2 gap-2">
            {LEAGUE_KEYS.map((key) => {
              const league = LEAGUES[key];
              const checked = selectedSports.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSport(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors text-left ${
                    checked
                      ? "border-brand-green bg-brand-green/10 text-brand-green"
                      : "border-brand-border bg-brand-surface text-brand-muted hover:border-brand-green/40"
                  }`}
                >
                  <span className="text-base">{league.emoji}</span>
                  <span className="font-medium">{league.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-green text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating…" : "Create Tournament"}
          </button>
          <Link
            href="/tournaments"
            className="px-4 py-2.5 rounded-lg border border-brand-border text-sm text-brand-muted hover:border-brand-green/40 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
