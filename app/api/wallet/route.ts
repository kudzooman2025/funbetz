import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { replenishSchema } from "@/lib/validators";
import { replenishWallet } from "@/lib/wallet";

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

  try {
    const balance = await replenishWallet(prisma, session.user.id, amount);
    return NextResponse.json({ balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not replenish wallet";
    return NextResponse.json({ error: message }, { status: message === "User not found" ? 404 : 400 });
  }
}
