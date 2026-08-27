/**
 * POST /api/eacf/admin/team-ratings — record an OVR/OFF/DEF snapshot.
 *
 * Snapshots accumulate rather than overwrite, so recruiting and progression
 * can be tracked across a season. The line algorithm reads the most recent
 * snapshot at or before a game's week.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/eacf/admin";

function validRating(n: unknown): n is number {
  const v = Number(n);
  return Number.isInteger(v) && v >= 0 && v <= 99;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    coachId?: unknown;
    seasonLabel?: unknown;
    weekNumber?: unknown;
    ovr?: unknown;
    off?: unknown;
    def?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const coachId = typeof body.coachId === "string" ? body.coachId : "";
  const seasonLabel =
    typeof body.seasonLabel === "string" ? body.seasonLabel.trim() : "";

  if (!coachId || !seasonLabel) {
    return NextResponse.json(
      { error: "Coach and season are required" },
      { status: 400 }
    );
  }
  if (!validRating(body.ovr) || !validRating(body.off) || !validRating(body.def)) {
    return NextResponse.json(
      { error: "OVR, OFF and DEF must each be whole numbers from 0 to 99" },
      { status: 400 }
    );
  }

  const coach = await prisma.eacfCoach.findUnique({
    where: { id: coachId },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  const weekNumber =
    body.weekNumber === undefined || body.weekNumber === null
      ? null
      : Number(body.weekNumber);
  if (weekNumber !== null && !Number.isInteger(weekNumber)) {
    return NextResponse.json({ error: "Invalid week number" }, { status: 400 });
  }

  const rating = await prisma.eacfTeamRating.create({
    data: {
      coachId,
      seasonLabel,
      weekNumber,
      ovrRating: Number(body.ovr),
      offRating: Number(body.off),
      defRating: Number(body.def),
    },
  });

  return NextResponse.json({ rating });
}
