/**
 * PATCH  /api/eacf/admin/coaches/[id] — rename, re-rank, link an account, or
 *                                       set the school for a season.
 * DELETE /api/eacf/admin/coaches/[id] — remove a coach who has no games.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/eacf/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: {
    name?: unknown;
    seedRank?: unknown;
    userId?: unknown;
    seasonLabel?: unknown;
    schoolName?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const coach = await prisma.eacfCoach.findUnique({ where: { id } });
  if (!coach) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  const data: { name?: string; seedRank?: number; userId?: string | null } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (body.seedRank !== undefined) {
    const rank = Number(body.seedRank);
    if (!Number.isInteger(rank) || rank < 1) {
      return NextResponse.json(
        { error: "Seed rank must be a positive whole number" },
        { status: 400 }
      );
    }
    data.seedRank = rank;
  }

  // userId: a string links an account, an explicit null unlinks one.
  if (body.userId !== undefined) {
    if (body.userId === null) {
      data.userId = null;
    } else if (typeof body.userId === "string") {
      const user = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const clash = await prisma.eacfCoach.findUnique({
        where: { userId: body.userId },
        select: { id: true, name: true },
      });
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: `That account is already linked to ${clash.name}` },
          { status: 409 }
        );
      }
      data.userId = body.userId;
    }
  }

  // School is season-scoped, so it is upserted rather than set on the coach.
  const seasonLabel =
    typeof body.seasonLabel === "string" ? body.seasonLabel.trim() : "";
  const schoolName =
    typeof body.schoolName === "string" ? body.schoolName.trim() : "";

  if (schoolName && !seasonLabel) {
    return NextResponse.json(
      { error: "A season is required to set a school" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const c = Object.keys(data).length
      ? await tx.eacfCoach.update({ where: { id }, data })
      : coach;

    if (seasonLabel && schoolName) {
      await tx.eacfCoachSeason.upsert({
        where: { coachId_seasonLabel: { coachId: id, seasonLabel } },
        create: { coachId: id, seasonLabel, schoolName },
        update: { schoolName },
      });
    }

    return c;
  });

  return NextResponse.json({ coach: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const games = await prisma.eacfGame.count({
    where: { OR: [{ homeCoachId: id }, { awayCoachId: id }] },
  });
  if (games > 0) {
    return NextResponse.json(
      {
        error: `That coach appears in ${games} game${games === 1 ? "" : "s"}. Remove those first — deleting would orphan their results.`,
      },
      { status: 409 }
    );
  }

  await prisma.eacfCoach.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
