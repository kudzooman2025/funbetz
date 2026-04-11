import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const challenge = await prisma.bracketChallenge.findUnique({
    where: { id },
    include: {
      _count: { select: { entries: true } },
      entries: {
        where: { userId: session.user.id },
        select: { id: true, picks: true, score: true, updatedAt: true },
      },
    },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    sport: challenge.sport,
    lockTime: challenge.lockTime,
    locked: new Date() >= challenge.lockTime,
    entryCount: challenge._count.entries,
    myEntry: challenge.entries[0] ?? null,
  });
}
