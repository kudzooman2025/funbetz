import type { PrismaClient } from "@/generated/prisma/client";
import { WALLET_MAX } from "./constants";

export async function replenishWallet(prisma: PrismaClient, userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // Bet placement and settlement also update this row. Acquire its lock
    // before checking eligibility so their committed changes are visible.
    const users = await tx.$queryRaw<{ wallet_balance: number }[]>`
      SELECT wallet_balance FROM users WHERE id = ${userId} FOR UPDATE
    `;
    if (!users.length) throw new Error("User not found");
    if (users[0].wallet_balance !== 0) throw new Error("Wallet must be at 0 to replenish");
    const pending = await tx.parlay.count({ where: { userId, status: "PENDING" } });
    if (pending) throw new Error("You cannot replenish while you have active parlays. Wait for all bets to resolve.");
    const balance = Math.min(amount, WALLET_MAX);
    await tx.user.update({ where: { id: userId }, data: { walletBalance: balance } });
    return balance;
  }, { isolationLevel: "ReadCommitted" });
}
