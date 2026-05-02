"use client";

import Link from "next/link";

export default function Day2RecapPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      {/* Back link */}
      <Link href="/schedule" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6 transition-colors">
        ← Back to Schedule
      </Link>

      <article className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/30 rounded-full px-3 py-1">
            <span className="text-brand-green text-xs font-bold uppercase tracking-widest">Day 2 Roundup</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Late Drama, Clean Sheets, and a Quarterfinal Bracket That Doesn't Play Favorites
          </h1>
          <p className="text-brand-muted text-sm">
            May 2, 2026 · VA Regional · U13 AD · MLS NEXT Cup Qualifiers
          </p>
        </div>

        <div className="border-t border-brand-border" />

        {/* Intro */}
        <p className="text-white/90 text-base leading-relaxed">
          Day 2 delivered everything you'd want from a tournament — a group-defining late winner, a pair of
          tiebreaker standoffs, and four undefeated group champions who have looked every bit as dangerous as
          their records suggest. The quarterfinal bracket is set, and it's loaded.
        </p>

        {/* Section: The Late Winner */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-l-2 border-brand-green pl-3">The Match of the Day</h2>
          <p className="text-white/80 leading-relaxed">
            The marquee fixture delivered. <span className="text-white font-semibold">FC DELCO</span> and{" "}
            <span className="text-white font-semibold">The Football Academy</span> entered their Day 2 showdown
            as the top two clubs in Group C — both unbeaten and in dominant form. It was tight,
            physical, and decided by a <span className="text-brand-yellow font-semibold">dramatic late goal</span> from
            FC DELCO to edge the Academy 2–1.
          </p>
          <p className="text-white/80 leading-relaxed">
            The result sealed first place for FC DELCO and sent a message to the rest of the field:
            the Group C favorites are not just statistical dominators — they find ways to win when it's hard.
            The Football Academy, for their part, showed tremendous character and leaves the group stage with
            their heads held high.
          </p>
        </div>

        {/* Callout block */}
        <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl p-4">
          <p className="text-brand-yellow font-bold text-sm uppercase tracking-wide mb-1">Clutch Factor</p>
          <p className="text-white/90 text-sm leading-relaxed">
            FC DELCO finishes group play undefeated — 10 goals for, 1 against across three games. They were clinical when dominant and clutch when it mattered most. A team that wins ugly when it has to is a dangerous quarterfinal opponent.
          </p>
        </div>

        {/* Section: Group Champions */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-l-2 border-brand-green pl-3">Group Champions</h2>
          <p className="text-white/80 leading-relaxed">
            Four clubs finished with perfect 9-point records:{" "}
            <span className="text-white font-semibold">Springfield SYC</span> (Group A, 7–2 overall),{" "}
            <span className="text-white font-semibold">Alexandria SA</span> (Group B, 6–1),{" "}
            <span className="text-white font-semibold">Baltimore Armour</span> (Group D, 7–2),
            and <span className="text-white font-semibold">FC DELCO</span> (Group C). All four go into
            Saturday's quarterfinals with maximum momentum and zero defeats to their name.
          </p>
          <p className="text-white/80 leading-relaxed">
            <span className="text-white font-semibold">Real Futbol Academy</span> (Group G) and{" "}
            <span className="text-white font-semibold">Charlotte Independence SC</span> (Group H) both
            finished with 8 points from an unbeaten campaign. Charlotte's tournament has been arguably
            the most tactically disciplined — they scored 5 goals and conceded <em>zero</em> across three
            games. In a knockout tournament, that defensive record is a weapon.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Clean sheet group winners", value: "3", note: "FC DELCO, Charlotte, Real Futbol" },
            { label: "Perfect records (9 pts)", value: "4", note: "SYC, Alexandria, Baltimore, DELCO" },
            { label: "Group E & F tiebreakers", value: "2", note: "Resolved by head-to-head / GD" },
            { label: "Total goals, Day 2", value: "🔥", note: "Multiple multi-goal finals" },
          ].map(({ label, value, note }) => (
            <div key={label} className="bg-white/5 border border-brand-border rounded-xl p-3 space-y-0.5">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-brand-muted text-xs">{note}</p>
            </div>
          ))}
        </div>

        {/* Section: Tiebreaker Drama */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-l-2 border-brand-green pl-3">Tiebreaker Drama in E & F</h2>
          <p className="text-white/80 leading-relaxed">
            Group E saw <span className="text-white font-semibold">Coppermine SC</span> and{" "}
            <span className="text-white font-semibold">Fox Soccer Academy Carolinas</span> finish level on
            7 points each. Fox actually posted the better goal differential (+7 to Coppermine's +2), but
            the tiebreaker went Coppermine's way — a deserved reward for the side that didn't lose a single
            game all tournament.
          </p>
          <p className="text-white/80 leading-relaxed">
            Group F mirrored it:{" "}
            <span className="text-white font-semibold">Queen City Mutiny FC</span> and{" "}
            <span className="text-white font-semibold">Trenton City Soccer Club</span> both reached 7 points.
            Trenton had the better goal differential (+4 vs. +1), but Queen City Mutiny took the group and
            the top seed heading into the quarterfinals.
          </p>
        </div>

        {/* Section: The Hard Luck Story */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-l-2 border-brand-border pl-3 text-white/70">Tough Tournament: Shore FC</h2>
          <p className="text-white/80 leading-relaxed">
            It's worth acknowledging a side that had a brutal introduction to this level.{" "}
            <span className="text-white font-semibold">Shore FC</span>, filling in for a late withdrawal
            in Group A, faced a gauntlet that included the tournament's eventual top seed in Springfield SYC.
            They finished 0–3 with 9 goals conceded and none scored — numbers that don't tell the full story
            of competing against some of the toughest competition in the region on short notice.
          </p>
        </div>

        <div className="border-t border-brand-border" />

        {/* Section: QF Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Saturday's Quarterfinal Matchups</h2>
          <p className="text-white/80 leading-relaxed">
            Kickoff at 9:45am. Here's what to watch for in each tie:
          </p>

          {/* QF Cards */}
          <div className="space-y-3">
            {/* QF5 */}
            <div className="bg-white/5 border border-brand-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">QF · A vs H</span>
                <span className="text-xs text-brand-muted">9:45am</span>
              </div>
              <p className="text-white font-semibold">Springfield SYC <span className="text-brand-muted font-normal">vs</span> Charlotte Independence SC</p>
              <p className="text-white/70 text-sm leading-relaxed">
                A clash of unbeaten sides. Springfield are the tournament's top scorer among perfect-record
                teams (7 goals), while Charlotte haven't conceded a single goal in three games. Something
                has to give.
              </p>
            </div>

            {/* QF6 */}
            <div className="bg-white/5 border border-brand-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">QF · D vs E</span>
                <span className="text-xs text-brand-muted">9:45am</span>
              </div>
              <p className="text-white font-semibold">Baltimore Armour <span className="text-brand-muted font-normal">vs</span> Coppermine SC</p>
              <p className="text-white/70 text-sm leading-relaxed">
                Baltimore's perfect 9-point haul meets Coppermine's unbeaten resilience. Baltimore have been
                efficient (7–2), Coppermine scrappy and hard to break down. This one could be decided by a
                single moment.
              </p>
            </div>

            {/* QF7 */}
            <div className="bg-white/5 border border-brand-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">QF · B vs G</span>
                <span className="text-xs text-brand-muted">9:45am</span>
              </div>
              <p className="text-white font-semibold">Alexandria SA <span className="text-brand-muted font-normal">vs</span> Real Futbol Academy</p>
              <p className="text-white/70 text-sm leading-relaxed">
                The pick of the quarterfinals on paper. Alexandria came in ranked and delivered — 3 wins,
                6–1. Real Futbol came in under the radar and outperformed their ranking all tournament long
                (8 points, undefeated, 7–1). Two sides that simply refused to lose all week.
              </p>
            </div>

            {/* QF8 */}
            <div className="bg-white/5 border border-brand-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">QF · C vs F</span>
                <span className="text-xs text-brand-muted">9:45am</span>
              </div>
              <p className="text-white font-semibold">FC DELCO <span className="text-brand-muted font-normal">vs</span> Queen City Mutiny FC</p>
              <p className="text-white/70 text-sm leading-relaxed">
                The group stage's most eye-catching statistical side against the tiebreaker kings of Group F.
                DELCO have been dominant and just proven they can win close games too. Queen City Mutiny
                will need to be resilient from the first whistle.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-border" />

        {/* Footer nav */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/news/day2"
            className="flex-1 text-center bg-white/5 border border-brand-border text-white text-sm font-semibold py-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            ← Day 2 Preview
          </Link>
          <Link
            href="/schedule"
            className="flex-1 text-center bg-brand-green text-black text-sm font-bold py-3 rounded-xl hover:bg-brand-green/80 transition-colors"
          >
            View Bracket →
          </Link>
        </div>
      </article>
    </div>
  );
}
