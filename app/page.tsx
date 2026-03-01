import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-6xl font-bold tracking-tight mb-2">
          <span className="text-brand-green">Fun</span>
          <span className="text-brand-gold">Betz</span>
        </h1>
        <p className="text-brand-muted text-lg mb-8">
          Free-to-play parlay betting across 7 major leagues
        </p>

        {/* Decorative Ticket */}
        <div className="ticket-border bg-brand-card p-6 mb-8 max-w-sm mx-auto text-left">
          <div className="text-xs text-brand-muted uppercase tracking-widest mb-4">
            Parlay Ticket
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center border-b border-brand-border pb-2">
              <span className="text-gray-300">Arsenal vs Chelsea</span>
              <span className="text-brand-green font-mono text-xs">WIN</span>
            </div>
            <div className="flex justify-between items-center border-b border-brand-border pb-2">
              <span className="text-gray-300">Liverpool vs Man City</span>
              <span className="text-brand-green font-mono text-xs">WIN</span>
            </div>
            <div className="flex justify-between items-center border-b border-brand-border pb-2">
              <span className="text-gray-300">Chiefs vs Bills</span>
              <span className="text-brand-green font-mono text-xs">WIN</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-brand-border flex justify-between items-center">
            <span className="text-brand-muted text-xs">3-GAME PARLAY</span>
            <span className="text-brand-gold font-mono font-bold">5x PAYOUT</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/register"
          className="inline-block bg-brand-green text-brand-dark font-bold text-lg px-8 py-3 rounded-lg hover:bg-green-400 transition-colors"
        >
          Get Started
        </Link>
        <p className="text-brand-muted text-sm mt-4">
          Start with 1,000 free betz. No real money involved.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-16">
        <div className="bg-brand-card border border-brand-border rounded-lg p-5 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <h3 className="font-semibold mb-1">Build Parlays</h3>
          <p className="text-brand-muted text-sm">
            Pick 3-8 winners across NFL, NBA, MLB &amp; more for up to 150x payouts
          </p>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-lg p-5 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <h3 className="font-semibold mb-1">Climb the Leaderboard</h3>
          <p className="text-brand-muted text-sm">
            Compete globally with cumulative scoring across all your bets
          </p>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-lg p-5 text-center">
          <div className="text-3xl mb-2">🎰</div>
          <h3 className="font-semibold mb-1">100% Free</h3>
          <p className="text-brand-muted text-sm">
            No real money. Just betz tokens, bragging rights, and fun
          </p>
        </div>
      </div>
    </div>
  );
}
