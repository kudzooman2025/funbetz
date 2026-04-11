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

  const entries = await prisma.bracketEntry.findMany({
    where: { challengeId: id },
    orderBy: [{ score: "desc" }, { updatedAt: "asc" }],
    take: 100,
    include: {
      user: { select: { username: true } },
    },
  });

  return NextResponse.json(
    entries.map((e, i) => ({
      rank: i + 1,
      username: e.user.username,
      score: e.score,
      isMe: e.userId === session.user!.id,
      updatedAt: e.updatedAt,
    }))
  );
}
