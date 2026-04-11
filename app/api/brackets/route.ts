import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const challenges = await prisma.bracketChallenge.findMany({
    orderBy: { lockTime: "asc" },
    include: {
      _count: { select: { entries: true } },
      entries: {
        where: { userId: session.user.id },
        select: { id: true, score: true, updatedAt: true },
      },
    },
  });

  return NextResponse.json(
    challenges.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sport: c.sport,
      lockTime: c.lockTime,
      locked: new Date() >= c.lockTime,
      entryCount: c._count.entries,
      myEntry: c.entries[0] ?? null,
    }))
  );
}
