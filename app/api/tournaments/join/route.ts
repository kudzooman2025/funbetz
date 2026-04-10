import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_MEMBERS_PER_TOURNAMENT = 300;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { inviteCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { inviteCode } = body;
  if (!inviteCode || typeof inviteCode !== "string") {
    return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    include: {
      members: { select: { userId: true } },
      sports: true,
      createdBy: { select: { id: true, username: true } },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Invalid invite code." }, { status: 404 });
  }

  if (tournament.status !== "ACTIVE") {
    return NextResponse.json({ error: "This tournament is no longer active." }, { status: 400 });
  }

  const alreadyMember = tournament.members.some((m) => m.userId === userId);
  if (alreadyMember) {
    return NextResponse.json({ error: "You are already a member of this tournament." }, { status: 400 });
  }

  if (tournament.members.length >= MAX_MEMBERS_PER_TOURNAMENT) {
    return NextResponse.json({ error: "This tournament has reached its maximum capacity." }, { status: 400 });
  }

  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId },
  });

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
      sports: tournament.sports.map((s) => s.sport),
      memberCount: tournament.members.length + 1,
      isCreator: false,
      isMember: true,
    },
  });
}
