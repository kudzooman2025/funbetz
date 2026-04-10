import { Navbar } from "@/components/layout/navbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        {children}
      </main>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-card border-t border-brand-border py-1 flex justify-around items-center z-50">
        <a href="/dashboard" className="flex flex-col items-center gap-0 px-1 py-1 text-brand-muted hover:text-brand-green" style={{ fontSize: "10px", minWidth: 0, flex: 1 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
          <span>Home</span>
        </a>
        <a href="/games" className="flex flex-col items-center gap-0 px-1 py-1 text-brand-muted hover:text-brand-green" style={{ fontSize: "10px", minWidth: 0, flex: 1 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span>Games</span>
        </a>
        <a href="/parlays" className="flex flex-col items-center gap-0 px-1 py-1 text-brand-muted hover:text-brand-green" style={{ fontSize: "10px", minWidth: 0, flex: 1 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
          <span>Parlays</span>
        </a>
        <a href="/leaderboard" className="flex flex-col items-center gap-0 px-1 py-1 text-brand-muted hover:text-brand-green" style={{ fontSize: "10px", minWidth: 0, flex: 1 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span>Ranks</span>
        </a>
        <a href="/tournaments" className="flex flex-col items-center gap-0 px-1 py-1 text-brand-muted hover:text-brand-green" style={{ fontSize: "10px", minWidth: 0, flex: 1 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          <span>Groups</span>
        </a>
      </nav>
    </div>
  );
}
