import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/tournaments/[id]/members/[userId] — creator removes a member
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requesterId = session.user.id;
  const { id: tournamentId, userId: targetUserId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (tournament.createdById !== requesterId) {
    return NextResponse.json({ error: "Only the creator can remove members." }, { status: 403 });
  }
  if (targetUserId === tournament.createdById) {
    return NextResponse.json({ error: "Cannot remove the tournament creator." }, { status: 400 });
  }

  const membership = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "User is not a member of this tournament." }, { status: 404 });
  }

  await prisma.tournamentMember.delete({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
  });

  return NextResponse.json({ success: true });
}
