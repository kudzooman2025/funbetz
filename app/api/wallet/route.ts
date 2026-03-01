import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { replenishSchema } from "@/lib/validators";
import { WALLET_MAX } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletBalance: true },
  });

  return NextResponse.json({ balance: user?.walletBalance ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = replenishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { amount } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletBalance: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.walletBalance !== 0) {
    return NextResponse.json(
      { error: "Wallet must be at 0 to replenish" },
      { status: 400 }
    );
  }

  // Block replenish if user has any active (PENDING) parlays
  const activeParlays = await prisma.parlay.count({
    where: { userId: session.user.id, status: "PENDING" },
  });

  if (activeParlays > 0) {
    return NextResponse.json(
      { error: "You cannot replenish while you have active parlays. Wait for all bets to resolve." },
      { status: 400 }
    );
  }

  const newBalance = Math.min(amount, WALLET_MAX);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { walletBalance: newBalance },
  });

  return NextResponse.json({ balance: newBalance });
}
