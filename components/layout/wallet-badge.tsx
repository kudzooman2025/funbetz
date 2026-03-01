"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function WalletBadge() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function fetchBalance() {
      try {
        const res = await fetch("/api/wallet");
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch {
        // Silently fail
      }
    }

    fetchBalance();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return (
    <Link
      href="/wallet"
      className={`font-mono text-sm px-3 py-1.5 rounded-lg border transition-colors ${
        balance === 0
          ? "bg-red-500/10 border-red-500/30 text-red-400"
          : "bg-brand-green/10 border-brand-green/30 text-brand-green"
      }`}
    >
      {balance !== null ? `${balance.toLocaleString()} B` : "---"}
    </Link>
  );
}
