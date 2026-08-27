/**
 * POST /api/eacf/admin/weeks — create a game-week.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/eacf/admin";

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { seasonLabel?: unknown; weekNumber?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const seasonLabel =
    typeof body.seasonLabel === "string" ? body.seasonLabel.trim() : "";
  const weekNumber = Number(body.weekNumber);

  if (!seasonLabel) {
    return NextResponse.json({ error: "Season is required" }, { status: 400 });
  }
  if (!Number.isInteger(weekNumber) || weekNumber < 0) {
    return NextResponse.json({ error: "Invalid week number" }, { status: 400 });
  }

  const existing = await prisma.eacfWeek.findUnique({
    where: { seasonLabel_weekNumber: { seasonLabel, weekNumber } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Week ${weekNumber} of ${seasonLabel} already exists` },
      { status: 409 }
    );
  }

  const week = await prisma.eacfWeek.create({
    data: { seasonLabel, weekNumber },
  });
  return NextResponse.json({ week });
}
