"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WalletBadge } from "./wallet-badge";

// Default sports shown when navigating to Games from the navbar.
// Covers the main leagues so the page never lands on an empty state.
const DEFAULT_GAMES_HREF = "/games?sports=NFL,NBA,MLB,EPL,NHL,NCAAF,PGA,LIV";

type NavItem = { label: string; href: string; link?: string };

// Desktop nav items — label, href to match against (for active detection)
const DESKTOP_NAV: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard" },
  { label: "Games",       href: "/games",      link: DEFAULT_GAMES_HREF },
  { label: "My Parlays",  href: "/parlays" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Brackets",    href: "/brackets" },
  { label: "Schedule",    href: "/schedule" },
];

// Mobile scrollable tab strip items
const MOBILE_TAB_NAV: NavItem[] = [
  { label: "🏠 Home",      href: "/dashboard" },
  { label: "🎮 Games",     href: "/games",      link: DEFAULT_GAMES_HREF },
  { label: "🎟️ Parlays",  href: "/parlays" },
  { label: "🏆 Ranks",     href: "/leaderboard" },
  { label: "⭐ Groups",    href: "/tournaments" },
  { label: "🏆 Brackets",  href: "/brackets" },
  { label: "📅 Schedule",  href: "/schedule" },
  { label: "💰 Wallet",    href: "/wallet" },
];

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the dropdown whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Returns true if the current pathname matches or starts with the given href.
  // Uses startsWith so /games?sports=... still highlights the Games link.
  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/") || (href !== "/dashboard" && pathname.startsWith(href));
  }

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
          {DESKTOP_NAV.map(({ label, href, link }) => (
            <Link
              key={href}
              href={link ?? href}
              className={`transition-colors ${
                isActive(href)
                  ? "text-brand-green font-semibold"
                  : "text-gray-300 hover:text-brand-green"
              }`}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://www.mlssoccer.com/mlsnext/tournaments/cup/qualifiers/standings/virginia_regional"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-gold hover:text-yellow-300 transition-colors text-xs font-semibold border border-brand-gold/40 px-2.5 py-1 rounded-full"
          >
            🌐 Official Standings
          </a>
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
                {session?.user?.isAdmin && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-sm text-brand-green hover:bg-brand-surface"
                    onClick={() => setMenuOpen(false)}
                  >
                    ⚙️ Admin
                  </Link>
                )}
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
        {MOBILE_TAB_NAV.map(({ label, href, link }) => (
          <Link
            key={href}
            href={link ?? href}
            className={`flex-shrink-0 px-4 py-2.5 text-xs whitespace-nowrap font-medium transition-colors ${
              isActive(href)
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-gray-300 hover:text-brand-green"
            }`}
          >
            {label}
          </Link>
        ))}
        <a
          href="https://www.mlssoccer.com/mlsnext/tournaments/cup/qualifiers/standings/virginia_regional"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-4 py-2.5 text-xs text-brand-gold hover:text-yellow-300 whitespace-nowrap font-medium"
        >
          🌐 Official Site
        </a>
      </nav>
    </header>
  );
}
