import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

/*
 * Broadcast-scoreboard type system:
 *   Barlow Condensed — display, headings, team names, labels, buttons (always uppercase)
 *   IBM Plex Mono    — every numeral: countdown, wallet, stake, payout, multiplier, ranks
 *   IBM Plex Sans    — body copy, usernames, descriptive lines
 */
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "FunBetz - Free Parlay Betting",
  description:
    "Build parlays across NFL, NBA, MLB, NHL, college football, college basketball, and EPL with virtual betz. Compete on the global leaderboard!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="font-sans antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
