"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DEFAULT_GAMES_HREF = "/games?sports=NFL,NBA,MLB,EPL,NHL,NCAAF,PGA,LIV";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/dashboard",
    link: "/dashboard",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
    ),
  },
  {
    label: "Games",
    href: "/games",
    link: DEFAULT_GAMES_HREF,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
  },
  {
    label: "Parlays",
    href: "/parlays",
    link: "/parlays",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    ),
  },
  {
    label: "Ranks",
    href: "/leaderboard",
    link: "/leaderboard",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    label: "Groups",
    href: "/tournaments",
    link: "/tournaments",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
  },
  {
    label: "Bracket",
    href: "/brackets",
    link: "/brackets",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    // /dashboard must match exactly to avoid matching everything
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-card border-t border-brand-border py-1 flex justify-around items-center z-50">
      {NAV_ITEMS.map(({ label, href, link, icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={link}
            className={`flex flex-col items-center gap-0 px-1 py-1 transition-colors ${
              active ? "text-brand-green" : "text-brand-muted hover:text-brand-green"
            }`}
            style={{ fontSize: "10px", minWidth: 0, flex: 1 }}
          >
            <svg
              className={`w-4 h-4 ${active ? "stroke-brand-green" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {icon}
            </svg>
            <span className={active ? "font-semibold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
