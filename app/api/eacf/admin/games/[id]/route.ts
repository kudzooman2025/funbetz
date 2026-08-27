/**
 * PATCH  /api/eacf/admin/games/[id] — lock betting, or record the final score.
 * DELETE /api/eacf/admin/games/[id] — remove a game that has no bets.
 *
 * Locking is admin-driven and deliberately separate from scoring: a score
 * arriving must never be the thing that stops betting, or someone ends up
 * betting a game that has already been played.
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

  let body: { lock?: unknown; homeScore?: unknown; awayScore?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const game = await prisma.eacfGame.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const data: {
    status?: "LOCKED" | "FINAL";
    lockedAt?: Date;
    homeScore?: number;
    awayScore?: number;
  } = {};

  if (body.lock === true) {
    data.status = "LOCKED";
    data.lockedAt = new Date();
  }

  const hasScores = body.homeScore !== undefined && body.awayScore !== undefined;
  if (hasScores) {
    const home = Number(body.homeScore);
    const away = Number(body.awayScore);
    if (
      !Number.isInteger(home) ||
      !Number.isInteger(away) ||
      home < 0 ||
      away < 0
    ) {
      return NextResponse.json(
        { error: "Scores must be whole numbers of 0 or more" },
        { status: 400 }
      );
    }
    if (game.status !== "LOCKED" && game.status !== "FINAL") {
      return NextResponse.json(
        {
          error:
            "Lock this game before recording a score — otherwise bets could still be placed on a played game.",
        },
        { status: 409 }
      );
    }
    data.homeScore = home;
    data.awayScore = away;
    data.status = "FINAL";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.eacfGame.update({ where: { id }, data });
  return NextResponse.json({ game: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const bets = await prisma.eacfBet.count({ where: { gameId: id } });
  if (bets > 0) {
    return NextResponse.json(
      {
        error: `That game already has ${bets} bet${bets === 1 ? "" : "s"} on it. Deleting it would destroy staked betz.`,
      },
      { status: 409 }
    );
  }

  await prisma.eacfGame.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
