"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { WalletBadge } from "./wallet-badge";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, []);

  return (
    <header className="bg-brand-card border-b border-brand-border sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="text-xl font-bold">
          <span className="text-brand-green">Fun</span>
          <span className="text-brand-gold">Betz</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-gray-300 hover:text-brand-green transition-colors">
            Dashboard
          </Link>
          <Link href="/games" className="text-gray-300 hover:text-brand-green transition-colors">
            Games
          </Link>
          <Link href="/parlays" className="text-gray-300 hover:text-brand-green transition-colors">
            My Parlays
          </Link>
          <Link href="/leaderboard" className="text-gray-300 hover:text-brand-green transition-colors">
            Leaderboard
          </Link>
          <Link href="/tournaments" className="text-gray-300 hover:text-brand-green transition-colors">
            Tournaments
          </Link>
        </nav>

        {/* Right side: wallet + user */}
        <div className="flex items-center gap-3">
          <WalletBadge />

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-sm text-gray-300 hover:text-white bg-brand-surface px-3 py-1.5 rounded-lg border border-brand-border"
            >
              {session?.user?.username || "User"}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-brand-card border border-brand-border rounded-lg shadow-lg py-1 z-50">
                <Link
                  href="/wallet"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-surface"
                  onClick={() => setMenuOpen(false)}
                >
                  Wallet
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-brand-surface"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile tab strip — scrollable horizontal nav under the header bar */}
      <nav className="md:hidden flex overflow-x-auto border-t border-brand-border bg-brand-card scrollbar-hide">
        <Link href="/dashboard" className="flex-shrink-0 px-4 py-2 text-xs text-brand-muted hover:text-brand-green whitespace-nowrap">
          🏠 Home
        </Link>
        <Link href="/games" className="flex-shrink-0 px-4 py-2 text-xs text-brand-muted hover:text-brand-green whitespace-nowrap">
          🎮 Games
        </Link>
        <Link href="/parlays" className="flex-shrink-0 px-4 py-2 text-xs text-brand-muted hover:text-brand-green whitespace-nowrap">
          🎟️ Parlays
        </Link>
        <Link href="/leaderboard" className="flex-shrink-0 px-4 py-2 text-xs text-brand-muted hover:text-brand-green whitespace-nowrap">
          🏆 Ranks
        </Link>
        <Link href="/tournaments" className="flex-shrink-0 px-4 py-2 text-xs text-brand-muted hover:text-brand-green whitespace-nowrap">
          ⭐ Groups
        </Link>
        <Link href="/wallet" className="flex-shrink-0 px-4 py-2 text-xs text-brand-muted hover:text-brand-green whitespace-nowrap">
          💰 Wallet
        </Link>
      </nav>
    </header>
  );
}
