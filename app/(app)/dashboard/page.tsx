import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Choose a Sport</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* EPL Card */}
        <Link
          href="/games/epl"
          className="bg-brand-card border border-brand-border rounded-lg p-6 hover:border-brand-green transition-colors group"
        >
          <div className="text-4xl mb-3">&#9917;</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-brand-green transition-colors">
            English Premier League
          </h2>
          <p className="text-brand-muted text-sm">
            Pick winners from EPL soccer matches
          </p>
        </Link>

        {/* NFL Card */}
        <Link
          href="/games/nfl"
          className="bg-brand-card border border-brand-border rounded-lg p-6 hover:border-brand-green transition-colors group"
        >
          <div className="text-4xl mb-3">&#127944;</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-brand-green transition-colors">
            NFL
          </h2>
          <p className="text-brand-muted text-sm">
            Pick winners from NFL football games
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
