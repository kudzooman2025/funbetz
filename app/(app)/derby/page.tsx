"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  DERBY_HORSES, DERBY_LOCK_TIME, DERBY_YEAR,
  calcWinPayout, calcExactaPayout, calcTrifectaPayout,
  type DerbyHorse,
} from "@/lib/derby-config";

const POST_TIME = "6:57 PM ET · Saturday May 2, 2026 · Churchill Downs";

function OddsTag({ odds }: { odds: string }) {
  return (
    <span className="text-xs font-bold bg-brand-gold/20 text-brand-gold border border-brand-gold/30 rounded px-1.5 py-0.5 ml-2 shrink-0">
      {odds}
    </span>
  );
}

function HorsePicker({
  label, value, onChange, exclude = [], disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; exclude?: string[]; disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-brand-muted mb-1 font-medium">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:border-brand-green focus:outline-none disabled:opacity-50"
      >
        <option value="">— Select horse —</option>
        {DERBY_HORSES.filter((h) => !exclude.includes(h.name)).map((h) => (
          <option key={h.name} value={h.name}>
            #{h.post} {h.name} ({h.odds})
          </option>
        ))}
      </select>
    </div>
  );
}

function WagerInput({
  value, onChange, disabled, max,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean; max?: number;
}) {
  return (
    <div>
      <p className="text-xs text-brand-muted mb-1 font-medium">Wager (betz)</p>
      <input
        type="number" min="1" max={max ?? 9999} step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g. 50"
        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:border-brand-green focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}

export default function DerbyPage() {
  const { data: session } = useSession();
  const [locked, setLocked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingPick, setExistingPick] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<{ first?: string; second?: string; third?: string } | null>(null);

  // Win state
  const [winHorse, setWinHorse] = useState("");
  const [winWager, setWinWager] = useState("");

  // Exacta state
  const [ex1, setEx1] = useState("");
  const [ex2, setEx2] = useState("");
  const [exWager, setExWager] = useState("");

  // Trifecta state
  const [tri1, setTri1] = useState("");
  const [tri2, setTri2] = useState("");
  const [tri3, setTri3] = useState("");
  const [triWager, setTriWager] = useState("");

  const getOdds = (name: string) => DERBY_HORSES.find((h) => h.name === name)?.oddsNum ?? 0;

  // Live potential payouts
  const winPotential = winHorse && winWager ? calcWinPayout(Number(winWager), getOdds(winHorse)) : null;
  const exPotential = ex1 && ex2 && exWager ? calcExactaPayout(Number(exWager), getOdds(ex1), getOdds(ex2)) : null;
  const triPotential = tri1 && tri2 && tri3 && triWager
    ? calcTrifectaPayout(Number(triWager), getOdds(tri1), getOdds(tri2), getOdds(tri3)) : null;

  const totalWager = (winHorse && winWager ? Number(winWager) : 0) +
    (ex1 && ex2 && exWager ? Number(exWager) : 0) +
    (tri1 && tri2 && tri3 && triWager ? Number(triWager) : 0);

  const loadPick = useCallback(async () => {
    const res = await fetch("/api/derby/results");
    if (res.ok) {
      const data = await res.json();
      if (data.result?.settled) setResult(data.result);
      if (data.userPick) {
        const p = data.userPick;
        setExistingPick(p);
        if (p.winHorse) setWinHorse(p.winHorse);
        if (p.winWager) setWinWager(String(p.winWager));
        if (p.exacta1) setEx1(p.exacta1);
        if (p.exacta2) setEx2(p.exacta2);
        if (p.exactaWager) setExWager(String(p.exactaWager));
        if (p.trifecta1) setTri1(p.trifecta1);
        if (p.trifecta2) setTri2(p.trifecta2);
        if (p.trifecta3) setTri3(p.trifecta3);
        if (p.trifectaWager) setTriWager(String(p.trifectaWager));
      }
    }
    setLocked(new Date() >= DERBY_LOCK_TIME);
  }, []);

  useEffect(() => { loadPick(); }, [loadPick]);

  // Countdown timer
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = DERBY_LOCK_TIME.getTime() - Date.now();
      if (diff <= 0) { setLocked(true); setCountdown("Locked"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function placeBets() {
    setError("");
    if (totalWager < 1) { setError("Add at least one bet"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/derby/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winHorse: winHorse || undefined,
          winWager: winHorse && winWager ? Number(winWager) : undefined,
          exacta1: ex1 || undefined,
          exacta2: ex2 || undefined,
          exactaWager: ex1 && ex2 && exWager ? Number(exWager) : undefined,
          trifecta1: tri1 || undefined,
          trifecta2: tri2 || undefined,
          trifecta3: tri3 || undefined,
          trifectaWager: tri1 && tri2 && tri3 && triWager ? Number(triWager) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); }
      else { setSaved(true); setExistingPick(data.pick); }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  // ── Results view ────────────────────────────────────────────────────────────
  if (result?.first) {
    const p = existingPick as Record<string, unknown> | null;
    return (
      <div className="max-w-2xl mx-auto pb-24 space-y-5">
        <div className="text-center pt-4">
          <div className="text-5xl mb-2">🏇</div>
          <h1 className="text-2xl font-bold text-white">Kentucky Derby {DERBY_YEAR}</h1>
          <p className="text-brand-muted text-sm">{POST_TIME}</p>
        </div>

        <div className="bg-brand-gold/10 border border-brand-gold/40 rounded-xl p-5 text-center">
          <p className="text-brand-gold text-xs font-bold uppercase tracking-widest mb-3">Official Results</p>
          <div className="space-y-2">
            {[["🥇 1st", result.first], ["🥈 2nd", result.second], ["🥉 3rd", result.third]].map(([pos, horse]) => (
              <div key={pos} className="flex items-center justify-between bg-brand-card rounded-lg px-4 py-2">
                <span className="text-sm text-brand-muted">{pos}</span>
                <span className="text-white font-bold">{horse}</span>
              </div>
            ))}
          </div>
        </div>

        {p && (
          <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-3">
            <h2 className="text-white font-bold">Your Results</h2>
            {p.winHorse && (
              <div className="flex items-center justify-between">
                <span className="text-brand-muted text-sm">Win: <span className="text-white">{String(p.winHorse)}</span></span>
                <span className={`text-sm font-bold ${p.winResult === "won" ? "text-brand-green" : "text-red-400"}`}>
                  {p.winResult === "won" ? `+${p.winPayout} betz` : "Lost"}
                </span>
              </div>
            )}
            {p.exacta1 && (
              <div className="flex items-center justify-between">
                <span className="text-brand-muted text-sm">Exacta: <span className="text-white">{String(p.exacta1)} / {String(p.exacta2)}</span></span>
                <span className={`text-sm font-bold ${p.exactaResult === "won" ? "text-brand-green" : "text-red-400"}`}>
                  {p.exactaResult === "won" ? `+${p.exactaPayout} betz` : "Lost"}
                </span>
              </div>
            )}
            {p.trifecta1 && (
              <div className="flex items-center justify-between">
                <span className="text-brand-muted text-sm">Trifecta: <span className="text-white">{String(p.trifecta1)} / {String(p.trifecta2)} / {String(p.trifecta3)}</span></span>
                <span className={`text-sm font-bold ${p.trifectaResult === "won" ? "text-brand-green" : "text-red-400"}`}>
                  {p.trifectaResult === "won" ? `+${p.trifectaPayout} betz` : "Lost"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Betting view ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-5">
      {/* Hero */}
      <div className="text-center pt-4">
        <div className="text-5xl mb-2">🏇</div>
        <h1 className="text-2xl font-bold text-white">Kentucky Derby {DERBY_YEAR}</h1>
        <p className="text-brand-muted text-sm mt-1">{POST_TIME}</p>
        <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full border text-sm font-semibold ${
          locked ? "bg-red-900/20 border-red-500/40 text-red-400" : "bg-brand-green/10 border-brand-green/30 text-brand-green"
        }`}>
          {locked ? "🔒 Betting Closed" : `⏱ Closes in ${countdown}`}
        </div>
      </div>

      {saved && (
        <div className="bg-brand-green/10 border border-brand-green/40 rounded-xl p-4 text-center text-brand-green font-semibold">
          ✅ Bets saved! Good luck! 🍀
        </div>
      )}

      {existingPick && !saved && !locked && (
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-3 text-center text-brand-gold text-sm">
          You have existing picks — update them below before the race locks.
        </div>
      )}

      {/* Win Bet */}
      <section className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            🥇 Win Bet
            <span className="text-xs text-brand-muted font-normal">Pick the winner · payout based on odds</span>
          </h2>
        </div>
        <HorsePicker label="Pick to Win" value={winHorse} onChange={setWinHorse} disabled={locked} />
        <WagerInput value={winWager} onChange={setWinWager} disabled={locked} />
        {winPotential && (
          <div className="flex items-center justify-between bg-brand-surface rounded-lg px-4 py-2">
            <span className="text-xs text-brand-muted">Potential Payout</span>
            <span className="text-brand-green font-bold">+{winPotential.toLocaleString()} betz</span>
          </div>
        )}
      </section>

      {/* Exacta */}
      <section className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            🎯 Exacta
            <span className="text-xs text-brand-muted font-normal">Pick 1st & 2nd in exact order</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HorsePicker label="1st Place" value={ex1} onChange={setEx1} exclude={[ex2, tri1, tri2, tri3].filter(Boolean)} disabled={locked} />
          <HorsePicker label="2nd Place" value={ex2} onChange={setEx2} exclude={[ex1, tri1, tri2, tri3].filter(Boolean)} disabled={locked} />
        </div>
        <WagerInput value={exWager} onChange={setExWager} disabled={locked} />
        {exPotential && (
          <div className="flex items-center justify-between bg-brand-surface rounded-lg px-4 py-2">
            <span className="text-xs text-brand-muted">Potential Payout</span>
            <span className="text-brand-green font-bold">+{exPotential.toLocaleString()} betz</span>
          </div>
        )}
      </section>

      {/* Trifecta */}
      <section className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            🏆 Trifecta
            <span className="text-xs text-brand-muted font-normal">Pick 1st, 2nd & 3rd in exact order</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <HorsePicker label="1st Place" value={tri1} onChange={setTri1} exclude={[tri2, tri3].filter(Boolean)} disabled={locked} />
          <HorsePicker label="2nd Place" value={tri2} onChange={setTri2} exclude={[tri1, tri3].filter(Boolean)} disabled={locked} />
          <HorsePicker label="3rd Place" value={tri3} onChange={setTri3} exclude={[tri1, tri2].filter(Boolean)} disabled={locked} />
        </div>
        <WagerInput value={triWager} onChange={setTriWager} disabled={locked} />
        {triPotential && (
          <div className="flex items-center justify-between bg-brand-surface rounded-lg px-4 py-2">
            <span className="text-xs text-brand-muted">Potential Payout</span>
            <span className="text-brand-green font-bold">+{triPotential.toLocaleString()} betz</span>
          </div>
        )}
      </section>

      {/* Field reference */}
      <section className="bg-brand-card border border-brand-border rounded-xl p-4">
        <p className="text-xs text-brand-muted font-bold uppercase tracking-widest mb-3">Full Field · Morning Line Odds</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {DERBY_HORSES.map((h) => (
            <div key={h.name} className="flex items-center justify-between bg-brand-surface rounded-lg px-3 py-1.5">
              <span className="text-xs text-brand-muted mr-2">#{h.post}</span>
              <span className="text-sm text-white flex-1 truncate">{h.name}</span>
              <OddsTag odds={h.odds} />
            </div>
          ))}
        </div>
      </section>

      {/* Place bets */}
      {!locked && (
        <div className="space-y-2">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-brand-muted">Total wager</span>
            <span className="text-white font-bold">{totalWager.toLocaleString()} betz</span>
          </div>
          <button
            onClick={placeBets}
            disabled={saving || totalWager < 1}
            className="w-full bg-brand-gold hover:bg-yellow-400 disabled:opacity-40 text-brand-dark font-bold py-3 rounded-xl transition-colors text-base"
          >
            {saving ? "Placing Bets…" : existingPick ? "Update My Bets 🏇" : "Place My Bets 🏇"}
          </button>
          <p className="text-center text-xs text-brand-muted">
            Bets lock at 6:42 PM ET · Race at 6:57 PM ET
          </p>
        </div>
      )}
    </div>
  );
}
