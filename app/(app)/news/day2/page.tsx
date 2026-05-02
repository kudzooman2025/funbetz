"use client";

import Link from "next/link";

export default function Day2PreviewPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <Link href="/schedule" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6 transition-colors">
        ← Back to Schedule
      </Link>

      <article className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Day 2 Preview</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Form Over Rankings: What Day 1 Tells Us About Today
          </h1>
          <p className="text-brand-muted text-sm">May 2, 2026 · VA Regional · U13 AD · MLS NEXT Cup Qualifiers</p>
        </div>

        <div className="border-t border-brand-border" />

        {/* Intro */}
        <p className="text-white/90 text-base leading-relaxed">
          The pre-tournament rankings told one story. Day 1 told another. As the final group stage
          matchday gets underway in Virginia, the form book is already rewriting the script —
          and in three groups, today's results will determine who goes home and who advances to Saturday's
          quarterfinals.
        </p>

        {/* Section: Rankings vindicated */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Where the Rankings Got It Right</h2>
          <p className="text-white/80 leading-relaxed">
            The pre-event billing of <span className="text-white font-semibold">FC DELCO (#206)</span> as the
            tournament's standout side looks fully justified after Day 1. An 8–0 aggregate across two games,
            with zero goals conceded, is as authoritative as group stage performances come. The highest-ranked
            club in the field played like it.
          </p>
          <p className="text-white/80 leading-relaxed">
            <span className="text-white font-semibold">Alexandria SA (#561)</span> and{" "}
            <span className="text-white font-semibold">Players Development Academy (#560)</span> — ranked
            almost identically — both went 2-0 and kept clean sheets in Group B and Group H respectively,
            converting their pre-tournament expectations into points with efficiency.
          </p>
        </div>

        {/* Section: Rankings got it wrong */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Where the Rankings Got It Wrong</h2>

          {/* Real Futbol callout */}
          <div className="bg-brand-green/5 border border-brand-green/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-brand-green text-xs font-bold uppercase tracking-wide">Biggest Surprise</span>
              <span className="text-white text-xs font-semibold">Real Futbol Academy — Ranked #897</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              Nobody penciled in a #897-ranked side to dominate Group G. Yet Real Futbol Academy
              outscored their opponents 6–0 across two games — both clean sheets — to top the group with
              maximum points. In a tournament full of national top-500 clubs, they've been the most
              dominant team on the pitch. Rankings measure history. Real Futbol are writing new history today.
            </p>
          </div>

          {/* Keystone callout */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-wide">Biggest Upset</span>
              <span className="text-white text-xs font-semibold">Keystone FC (#1940) def. Loudoun SC (#487)</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              A team ranked nearly #2,000 nationally beating a top-500 club 3–1 is the result of the
              tournament so far. <span className="text-white font-semibold">Loudoun Soccer Club (#487)</span> arrived
              as one of the higher-ranked sides in Group G. They left Day 1 tied on points with
              Keystone FC — a team ranked 1,453 places below them. Rankings mean very little when
              you're 3–1 down.
            </p>
          </div>

          <p className="text-white/80 leading-relaxed">
            <span className="text-white font-semibold">Carolina Velocity FC (#211)</span> is the other
            notable underperformer relative to ranking. As the second-highest ranked team in the tournament,
            they were expected to cruise Group A. A 2–1 loss to{" "}
            <span className="text-white font-semibold">Springfield SYC (#380)</span> — a side ranked 169
            places below them — was a reminder that tournament football has its own logic. Springfield,
            untroubled by the occasion, were simply the better team on the day.
          </p>
        </div>

        {/* The Form Paradox */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">The Form Paradox: Fox Soccer vs Coppermine</h2>
          <p className="text-white/80 leading-relaxed">
            Today's most intriguing matchup carries a genuine rankings vs. form contradiction.
            <span className="text-white font-semibold"> Coppermine SC (#319)</span> enters as the
            higher-ranked side in Group E — comfortably so. But{" "}
            <span className="text-white font-semibold">Fox Soccer Academy Carolinas (#666)</span> have been
            the tournament's most explosive team: 8 goals scored, 1 conceded, two wins from two.
          </p>
          <p className="text-white/80 leading-relaxed">
            Coppermine's ranking is built on a long track record; Fox Soccer's Day 1 form is built on
            the last 24 hours. Which lens matters more in a single-elimination moment? Coppermine needs a
            win to take Group E. Fox Soccer just needs to not lose.
          </p>
          <div className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-sm">Coppermine SC</p>
              <p className="text-brand-muted text-xs">Ranked #319 · 5pts · +2 GD</p>
              <p className="text-xs text-yellow-400 mt-0.5">Rankings edge</p>
            </div>
            <div className="text-brand-muted font-bold px-2">vs</div>
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-sm">Fox Soccer Acad. Car.</p>
              <p className="text-brand-muted text-xs">Ranked #666 · 6pts · +7 GD</p>
              <p className="text-xs text-brand-green mt-0.5">Form edge</p>
            </div>
          </div>
          <p className="text-brand-muted text-xs italic">12:00 PM · Group E decider</p>
        </div>

        {/* Section: Group H */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Group H: The Final Chapter</h2>
          <p className="text-white/80 leading-relaxed">
            The most anticipated fixture of Day 2 needs no added context:{" "}
            <span className="text-white font-semibold">Players Development Academy (#560)</span> against{" "}
            <span className="text-white font-semibold">Charlotte Independence SC (#750)</span> at 9:00 AM
            to decide Group H. Both sides are 2-0 with 6 points and a +5 goal differential. The margins
            are so fine that PDA leads the group on goals scored alone — 6 to Charlotte's 5.
          </p>
          <p className="text-white/80 leading-relaxed">
            The rankings suggest PDA has a slight edge, but both clubs have shown they belong here.
            Charlotte's two clean sheets are arguably more impressive than PDA's goal-differential
            advantage. This one is a genuine 50/50, and only one side goes to the QF.
          </p>
        </div>

        {/* THE MATCH */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">The Match of the Tournament: DELCO vs Football Academy</h2>
          <div className="bg-brand-green/5 border border-brand-green/40 rounded-xl p-4 space-y-3">
            <p className="text-white/90 leading-relaxed">
              At 1:30 PM, <span className="text-white font-semibold">FC DELCO (#206)</span> face{" "}
              <span className="text-white font-semibold">The Football Academy (#778)</span> in a Group C
              clash with everything on the line. Winner advances to the QF; loser is eliminated.
            </p>
            <p className="text-white/80 leading-relaxed">
              The rankings are clear — DELCO are 572 places higher nationally. But the Football Academy
              have been quietly exceptional: unbeaten, <span className="text-white font-semibold">zero goals conceded</span>,
              and composed enough to win a penalty shootout when pushed. The performance of a #778-ranked
              team keeping back-to-back clean sheets against decent Group C competition demands respect.
            </p>
            <p className="text-white/80 leading-relaxed">
              DELCO's 8-goal haul is spectacular, but the Football Academy haven't faced anything like
              them yet. For one team today, the tournament ends here. For the other, a quarterfinal against
              Queen City Mutiny FC awaits.
            </p>
            <div className="flex items-center justify-between text-xs text-brand-muted border-t border-white/10 pt-3">
              <span>FC DELCO: 8 GF · 0 GA · #206 ranked</span>
              <span className="text-brand-green font-bold">1:30 PM · Group C</span>
              <span>Football Acad.: 2 GF · 0 GA · #778 ranked</span>
            </div>
          </div>
        </div>

        {/* Day 2 At a Glance */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Day 2 At a Glance</h2>
          <div className="space-y-2">
            {[
              { time: "9:00 AM",  label: "PDA vs Charlotte Independence SC",         note: "Group H winner-takes-all", hot: true  },
              { time: "9:00 AM",  label: "Springfield SYC vs Shore FC",            note: "Group A: SYC already through", hot: false },
              { time: "10:30 AM", label: "Real Futbol Academy vs Loudoun SC",         note: "Group G: Real Futbol safe, Loudoun needs bounce-back", hot: false },
              { time: "10:30 AM", label: "Alexandria SA vs Carolina Core FC",         note: "Group B: Alexandria through, order TBD", hot: false },
              { time: "12:00 PM", label: "Coppermine SC vs Fox Soccer Academy Car.",  note: "Group E decider — rankings vs form", hot: true  },
              { time: "12:00 PM", label: "Baltimore Armour vs FC Richmond",           note: "Group D: Baltimore through", hot: false },
              { time: "12:00 PM", label: "Ironbound SC vs PA Classics Harrisburg",   note: "Group D: 2nd place fight", hot: false },
              { time: "1:30 PM",  label: "FC DELCO vs The Football Academy",          note: "Group C: winner advances to QF", hot: true  },
              { time: "1:30 PM",  label: "Queen City Mutiny FC vs McLean Youth SC",  note: "Group F: Queen City through", hot: false },
            ].map(({ time, label, note, hot }) => (
              <div key={label} className={`rounded-xl border p-3 flex items-start gap-3 ${hot ? "border-brand-green/30 bg-brand-green/5" : "border-brand-border bg-brand-surface"}`}>
                <div className={`text-xs font-bold rounded px-2 py-1 flex-shrink-0 ${hot ? "bg-brand-green/20 text-brand-green" : "bg-brand-card text-brand-muted"}`}>
                  {time}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${hot ? "text-white" : "text-white/80"}`}>{label}</p>
                  <p className="text-brand-muted text-xs mt-0.5">{note}</p>
                </div>
                {hot && <span className="text-yellow-400 text-xs flex-shrink-0 self-center">🔥</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-brand-border pt-4 flex gap-3">
          <Link href="/news" className="flex-1 block text-center border border-brand-border text-white font-semibold py-3 rounded-xl hover:bg-white/5 transition-colors text-sm">
            ← Day 1 Recap
          </Link>
          <Link href="/brackets/va26-u13-ad" className="flex-1 block text-center bg-brand-green text-brand-dark font-bold py-3 rounded-xl hover:bg-green-400 transition-colors text-sm">
            View Your Bracket
          </Link>
        </div>
      </article>
    </div>
  );
}
