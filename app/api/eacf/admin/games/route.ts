/**
 * POST /api/eacf/admin/games — add a user-vs-user game to a week.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/eacf/admin";

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { weekId?: unknown; homeCoachId?: unknown; awayCoachId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const weekId = typeof body.weekId === "string" ? body.weekId : "";
  const homeCoachId =
    typeof body.homeCoachId === "string" ? body.homeCoachId : "";
  const awayCoachId =
    typeof body.awayCoachId === "string" ? body.awayCoachId : "";

  if (!weekId || !homeCoachId || !awayCoachId) {
    return NextResponse.json(
      { error: "Week and both coaches are required" },
      { status: 400 }
    );
  }
  if (homeCoachId === awayCoachId) {
    return NextResponse.json(
      { error: "A coach cannot play themselves" },
      { status: 400 }
    );
  }

  const [week, coachCount] = await Promise.all([
    prisma.eacfWeek.findUnique({ where: { id: weekId }, select: { id: true } }),
    prisma.eacfCoach.count({ where: { id: { in: [homeCoachId, awayCoachId] } } }),
  ]);

  if (!week) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 });
  }
  if (coachCount !== 2) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  // One game per pairing per week — a duplicate would split line submissions
  // across two boards for what is really the same matchup.
  const clash = await prisma.eacfGame.findFirst({
    where: {
      weekId,
      OR: [
        { homeCoachId, awayCoachId },
        { homeCoachId: awayCoachId, awayCoachId: homeCoachId },
      ],
    },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: "That matchup is already on this week's board" },
      { status: 409 }
    );
  }

  const game = await prisma.eacfGame.create({
    data: { weekId, homeCoachId, awayCoachId },
    include: {
      homeCoach: { select: { id: true, name: true } },
      awayCoach: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ game });
}
