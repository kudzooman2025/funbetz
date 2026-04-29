/**
 * GET /api/admin/bracket-entries?challengeId=...
 * Returns all bracket entries with full picks (admin only).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return session;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId");
  if (!challengeId) {
    return NextResponse.json({ error: "challengeId required" }, { status: 400 });
  }

  const entries = await prisma.bracketEntry.findMany({
    where: { challengeId },
    orderBy: [{ score: "desc" }, { updatedAt: "asc" }],
    include: { user: { select: { username: true, email: true } } },
  });

  return NextResponse.json(
    entries.map((e, i) => ({
      rank: i + 1,
      userId: e.userId,
      username: e.user.username,
      email: e.user.email,
      score: e.score,
      picks: e.picks,
      updatedAt: e.updatedAt,
    }))
  );
}
