"use client";

import Link from "next/link";

export default function NewsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      {/* Back link */}
      <Link href="/schedule" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6 transition-colors">
        ← Back to Schedule
      </Link>

      {/* Article */}
      <article className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/30 rounded-full px-3 py-1">
            <span className="text-brand-green text-xs font-bold uppercase tracking-widest">Day 1 Roundup</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Leaders Emerge, Group H Goes Down to the Wire
          </h1>
          <p className="text-brand-muted text-sm">
            May 1, 2026 · VA Regional · U13 AD · MLS NEXT Cup Qualifiers
          </p>
        </div>

        <div className="border-t border-brand-border" />

        {/* Intro */}
        <p className="text-white/90 text-base leading-relaxed">
          Eight groups, sixteen first-round fixtures, and some early statements have been made at the 2026
          MLS NEXT Cup Qualifiers in Virginia. After a full Day 1 slate, a handful of clubs have separated
          themselves from the pack — and a fascinating tiebreaker battle is already brewing in Group H.
        </p>

        {/* Section: Dominant Ones */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">The Dominant Ones</h2>
          <p className="text-white/80 leading-relaxed">
            <span className="text-white font-semibold">FC DELCO</span> (Group C) put on the most commanding
            display of the day, outscoring opponents 8–0 across two games for the best goal differential in
            the tournament at +8. They entered Day 2 with an iron grip on their group and loom as a genuine
            Championship contender.
          </p>
          <p className="text-white/80 leading-relaxed">
            Not far behind, <span className="text-white font-semibold">Fox Soccer Academy Carolinas</span> (Group E)
            posted an 8–1 goal tally for a +7 differential, while{" "}
            <span className="text-white font-semibold">Real Futbol Academy</span> (Group G) stayed perfect
            and clinical with a 6–0 scoreline — keeping a clean sheet through both games.
          </p>
        </div>

        {/* Stats callout */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { team: "FC DELCO", stat: "+8 GD", sub: "Group C · 2W 0L" },
            { team: "Fox Soccer AC", stat: "+7 GD", sub: "Group E · 2W 0L" },
            { team: "Real Futbol Acad.", stat: "6–0", sub: "Group G · 0 conceded" },
          ].map(({ team, stat, sub }) => (
            <div key={team} className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
              <p className="text-brand-green font-bold text-xl">{stat}</p>
              <p className="text-white text-xs font-semibold mt-0.5 truncate">{team}</p>
              <p className="text-brand-muted text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {/* Section: Group H */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">The Group H Standoff</h2>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-white/90 leading-relaxed">
              The most compelling subplot of Day 1 was the battle atop Group H.{" "}
              <span className="text-white font-semibold">Players Development Academy</span> and{" "}
              <span className="text-white font-semibold">Charlotte Independence Soccer Club</span> both won
              their first two matches, finishing level on 6 points with identical +5 goal differentials.
              PDA edges Charlotte on goals scored (6 vs. 5) — but with the final group game between the
              two still to play on Day 2, everything is on the line.
            </p>
          </div>
        </div>

        {/* Section: Clean Sheets */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Clean Sheet Kings</h2>
          <p className="text-white/80 leading-relaxed">
            Several group leaders have yet to concede a single goal through two games:
            FC DELCO, Real Futbol Academy, and <span className="text-white font-semibold">Alexandria SA</span> (Group B, 4–0)
            have all kept their nets clean. Alexandria have been particularly clinical at the back,
            shutting out both opponents while winning comfortably.
          </p>
        </div>

        {/* Section: QF Preview */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">QF Preview — If Day 1 Leaders Hold</h2>
          <p className="text-brand-muted text-sm">
            Based on predetermined group pairings (A vs H · D vs E · C vs F · B vs G)
          </p>
          <div className="space-y-2">
            {[
              {
                qf: "QF 1", pairing: "A vs H",
                home: "Springfield SYC", homeNote: "6pts · +2 GD",
                away: "PDA / Charlotte Ind. SC", awayNote: "Both on 6pts · tied",
                hot: false,
              },
              {
                qf: "QF 2", pairing: "D vs E",
                home: "Baltimore Armour", homeNote: "6pts · +3 GD",
                away: "Fox Soccer Academy Car.", awayNote: "6pts · +7 GD",
                hot: true,
              },
              {
                qf: "QF 3", pairing: "C vs F",
                home: "FC DELCO", homeNote: "6pts · +8 GD · dominant",
                away: "Queen City Mutiny FC", awayNote: "Group F confirmed",
                hot: true,
              },
              {
                qf: "QF 4", pairing: "B vs G",
                home: "Alexandria SA", homeNote: "6pts · 0 conceded",
                away: "Real Futbol Academy", awayNote: "6pts · 0 conceded",
                hot: true,
              },
            ].map(({ qf, pairing, home, homeNote, away, awayNote, hot }) => (
              <div key={qf} className={`rounded-xl border p-3 ${hot ? "border-brand-green/30 bg-brand-green/5" : "border-brand-border bg-brand-surface"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-brand-green">{qf} · Group {pairing}</span>
                  {hot && <span className="text-xs text-yellow-400">Watch this one</span>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{home}</p>
                    <p className="text-brand-muted text-xs">{homeNote}</p>
                  </div>
                  <span className="text-brand-muted font-bold flex-shrink-0">vs</span>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-white font-semibold truncate">{away}</p>
                    <p className="text-brand-muted text-xs">{awayNote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-muted italic">
            Projections based on Day 1 results. Matchups confirmed after Day 2.
          </p>
        </div>

        <div className="border-t border-brand-border pt-4">
          <Link
            href="/brackets/va26-u13-ad"
            className="w-full block text-center bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors"
          >
            Fill Out Your Bracket
          </Link>
        </div>
      </article>
    </div>
  );
}
