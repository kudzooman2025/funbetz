import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { LEAGUE_KEYS, type LeagueKey } from "@/lib/constants";

function generateInviteCode(): string {
  return randomBytes(5).toString("hex").toUpperCase(); // 10-char hex code
}

const MAX_ACTIVE_TOURNAMENTS_PER_USER = 5;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get tournaments the user created or is a member of
  const tournaments = await prisma.tournament.findMany({
    where: {
      OR: [
        { createdById: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      createdBy: { select: { id: true, username: true } },
      sports: true,
      members: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = tournaments.map((t) => ({
    id: t.id,
    name: t.name,
    inviteCode: t.inviteCode,
    createdBy: t.createdBy,
    startDate: t.startDate,
    endDate: t.endDate,
    status: t.status,
    description: t.description,
    createdAt: t.createdAt,
    sports: t.sports.map((s) => s.sport),
    memberCount: t.members.length,
    isCreator: t.createdById === userId,
    isMember: t.members.some((m) => m.userId === userId),
  }));

  return NextResponse.json({ tournaments: result });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Check active tournament limit
  const activeCount = await prisma.tournament.count({
    where: { createdById: userId, status: "ACTIVE" },
  });
  if (activeCount >= MAX_ACTIVE_TOURNAMENTS_PER_USER) {
    return NextResponse.json(
      { error: `You can only have ${MAX_ACTIVE_TOURNAMENTS_PER_USER} active tournaments at a time.` },
      { status: 400 }
    );
  }

  let body: { name?: string; description?: string; startDate?: string; endDate?: string; sports?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, description, startDate, endDate, sports } = body;

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    return NextResponse.json({ error: "Name must be at least 3 characters." }, { status: 400 });
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Start and end dates are required." }, { status: 400 });
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  if (!sports || !Array.isArray(sports) || sports.length === 0) {
    return NextResponse.json({ error: "Select at least one sport." }, { status: 400 });
  }
  const invalidSport = sports.find((s) => !LEAGUE_KEYS.includes(s as LeagueKey));
  if (invalidSport) {
    return NextResponse.json({ error: `Invalid sport: ${invalidSport}` }, { status: 400 });
  }

  // Generate a unique invite code
  let inviteCode: string = generateInviteCode();
  for (let tries = 0; tries < 5; tries++) {
    const existing = await prisma.tournament.findUnique({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      inviteCode,
      createdById: userId,
      startDate: start,
      endDate: end,
      status: "ACTIVE",
      sports: {
        create: sports.map((sport) => ({ sport: sport as LeagueKey })),
      },
      members: {
        create: [{ userId }], // Creator auto-joins
      },
    },
    include: {
      sports: true,
      members: { select: { userId: true } },
      createdBy: { select: { id: true, username: true } },
    },
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
      createdAt: tournament.createdAt,
      sports: tournament.sports.map((s) => s.sport),
      memberCount: tournament.members.length,
      isCreator: true,
      isMember: true,
    },
  });
}
