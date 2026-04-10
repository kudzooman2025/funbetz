import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/tournaments/[id]/leave — member leaves a tournament
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (tournament.createdById === userId) {
    return NextResponse.json(
      { error: "Creators cannot leave their own tournament. Cancel it instead." },
      { status: 400 }
    );
  }

  const membership = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this tournament." }, { status: 404 });
  }

  await prisma.tournamentMember.delete({
    where: { tournamentId_userId: { tournamentId, userId } },
  });

  return NextResponse.json({ success: true });
}
