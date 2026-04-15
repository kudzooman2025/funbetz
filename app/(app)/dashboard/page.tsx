"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LEAGUES, LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";

type LeagueWithFeatured = (typeof LEAGUES)[LeagueKey] & { featured?: boolean };

export default function DashboardPage() {
  const [selected, setSelected] = useState<LeagueKey[]>([]);
  const router = useRouter();

  const toggle = (key: LeagueKey) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    setSelected(selected.length === LEAGUE_KEYS.length ? [] : [...LEAGUE_KEYS]);
  };

  const viewGames = () => {
    if (selected.length === 0) return;
    router.push(`/games?sports=${selected.join(",")}`);
  };

  const featuredKeys = LEAGUE_KEYS.filter((k) => (LEAGUES[k] as LeagueWithFeatured).featured);
  const regularKeys = LEAGUE_KEYS.filter((k) => !(LEAGUES[k] as LeagueWithFeatured).featured);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Choose Sports</h1>
        <button
          onClick={selectAll}
          className="text-sm text-brand-muted hover:text-brand-green transition-colors"
        >
          {selected.length === LEAGUE_KEYS.length ? "Deselect All" : "Select All"}
        </button>
      </div>
      <p className="text-brand-muted text-sm mb-4">
        Tap to select one or more leagues, then view all available games.
      </p>

      {/* Featured: FIFA World Cup 2026 banner */}
      {featuredKeys.map((key) => {
        const league = LEAGUES[key];
        const isSelected = selected.includes(key);
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`w-full text-left rounded-xl p-5 mb-4 border-2 transition-all relative overflow-hidden ${
              isSelected
                ? "border-brand-gold bg-brand-gold/10"
                : "border-brand-gold/40 bg-gradient-to-r from-brand-card to-brand-gold/5 hover:border-brand-gold/70"
            }`}
          >
            {/* Shimmer strip */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-60" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{league.emoji}</span>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className={`font-bold text-base transition-colors ${isSelected ? "text-brand-gold" : "text-white"}`}>
                      {league.name}
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-brand-gold text-brand-dark px-1.5 py-0.5 rounded">
                      Live Soon
                    </span>
                  </div>
                  <p className="text-brand-muted text-xs">{league.description}</p>
                  <p className="text-brand-gold/70 text-xs mt-0.5">June 11 – July 19, 2026 &middot; USA, Canada &amp; Mexico</p>
                </div>
              </div>
              {isSelected && (
                <span className="text-brand-gold text-xl shrink-0">&#10003;</span>
              )}
            </div>
          </button>
        );
      })}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {regularKeys.map((key) => {
          const league = LEAGUES[key];
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`text-left bg-brand-card border rounded-lg p-4 transition-colors ${
                isSelected
                  ? "border-brand-green bg-brand-green/5"
                  : "border-brand-border hover:border-gray-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl">{league.emoji}</span>
                {isSelected && (
                  <span className="text-brand-green text-sm">&#10003;</span>
                )}
              </div>
              <h2
                className={`text-sm font-bold mb-0.5 transition-colors ${
                  isSelected ? "text-brand-green" : "text-white"
                }`}
              >
                {league.name}
              </h2>
              <p className="text-brand-muted text-xs">{league.description}</p>
            </button>
          );
        })}
      </div>

      {/* View Games button */}
      {selected.length > 0 && (
        <div className="mt-4">
          <button
            onClick={viewGames}
            className="w-full bg-brand-green text-brand-dark font-bold py-3 rounded-lg hover:bg-green-400 transition-colors"
          >
            View {selected.length === 1 ? LEAGUES[selected[0]].name : `${selected.length} Leagues`} Games
          </button>
        </div>
      )}

      {/* MLS NEXT Bracket Promo */}
      <div className="mt-8 bg-brand-card border border-brand-green/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-green">Live Now</span>
              <span className="text-xs bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">MLS NEXT</span>
            </div>
            <h2 className="text-white font-bold text-base leading-tight">VA Regional Bracket Challenge</h2>
            <p className="text-brand-muted text-xs mt-1">Pick group winners, predict scores & compete with the group. Locks May 1 at 7:45 AM.</p>
            <Link
              href="/brackets/va26-u13-ad"
              className="inline-block mt-3 px-4 py-1.5 bg-brand-green text-black text-xs font-bold rounded-lg hover:bg-green-400 transition-colors"
            >
              Enter Bracket →
            </Link>
          </div>
          <Link href="/brackets/va26-u13-ad" className="shrink-0">
            <Image
              src="/bracket-qr.png"
              alt="Scan to open bracket"
              width={96}
              height={96}
              className="rounded-lg"
            />
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/parlays"
          className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center text-sm hover:border-brand-green transition-colors"
        >
          <div className="text-lg mb-1">&#127915;</div>
          My Parlays
        </Link>
        <Link
          href="/leaderboard"
          className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center text-sm hover:border-brand-green transition-colors"
        >
          <div className="text-lg mb-1">&#127942;</div>
          Leaderboard
        </Link>
        <Link
          href="/wallet"
          className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center text-sm hover:border-brand-green transition-colors"
        >
          <div className="text-lg mb-1">&#128176;</div>
          Wallet
        </Link>
        <Link
          href="/ticket"
          className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center text-sm hover:border-brand-green transition-colors"
        >
          <div className="text-lg mb-1">&#127903;</div>
          Build Ticket
        </Link>
      </div>
    </div>
  );
}
