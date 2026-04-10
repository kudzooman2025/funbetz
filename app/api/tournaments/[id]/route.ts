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

  const userId = session.user.id;
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, username: true } },
      sports: true,
      members: {
        include: {
          user: { select: { id: true, username: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const isMember = tournament.members.some((m) => m.userId === userId);
  if (!isMember) {
    return NextResponse.json({ error: "You are not a member of this tournament." }, { status: 403 });
  }

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      inviteCode: tournament.inviteCode,
      createdBy: tournament.createdBy,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      status: tournament.status,
      description: tournament.description,
      createdAt: tournament.createdAt,
      sports: tournament.sports.map((s) => s.sport),
      members: tournament.members.map((m) => ({
        userId: m.userId,
        username: m.user.username,
        joinedAt: m.joinedAt,
      })),
      isCreator: tournament.createdById === userId,
      isMember: true,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (tournament.createdById !== userId) {
    return NextResponse.json({ error: "Only the creator can cancel a tournament." }, { status: 403 });
  }

  await prisma.tournament.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
