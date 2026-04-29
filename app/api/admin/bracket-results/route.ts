/**
 * GET  /api/admin/bracket-results?challengeId=va26-u13-ad
 *   → Returns all stored BracketResult rows for the challenge.
 *
 * POST /api/admin/bracket-results
 *   Body: { challengeId, round, key, winner }
 *   → Upserts a single result (manual entry / override).
 *
 * DELETE /api/admin/bracket-results
 *   Body: { challengeId, round, key }
 *   → Clears a single result.
 *
 * All endpoints require isAdmin === true.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  // Double-check from DB (session isAdmin is set at login; verify fresh)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return session;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId") ?? "va26-u13-ad";

  const results = await prisma.bracketResult.findMany({
    where: { challengeId },
    orderBy: [{ round: "asc" }, { key: "asc" }],
  });

  return NextResponse.json(results);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { challengeId, round, key, winner } = body as {
    challengeId?: string;
    round?: string;
    key?: string;
    winner?: string;
  };

  if (!challengeId || !round || !key || !winner) {
    return NextResponse.json(
      { error: "challengeId, round, key, and winner are required" },
      { status: 400 }
    );
  }

  const result = await prisma.bracketResult.upsert({
    where: { challengeId_round_key: { challengeId, round, key } },
    create: { challengeId, round, key, winner, source: "manual" },
    update: { winner, source: "manual" },
  });

  return NextResponse.json(result);
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { challengeId, round, key } = body as {
    challengeId?: string;
    round?: string;
    key?: string;
  };

  if (!challengeId || !round || !key) {
    return NextResponse.json(
      { error: "challengeId, round, and key are required" },
      { status: 400 }
    );
  }

  await prisma.bracketResult
    .delete({
      where: { challengeId_round_key: { challengeId, round, key } },
    })
    .catch(() => null); // ignore if it didn't exist

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { challengeId, results } = body as {
    challengeId?: string;
    results?: { round: string; key: string; winner: string }[];
  };

  if (!challengeId || !Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: "challengeId and results array required" }, { status: 400 });
  }

  const saved: string[] = [];
  for (const { round, key, winner } of results) {
    if (!round || !key || !winner) continue;
    await prisma.bracketResult.upsert({
      where: { challengeId_round_key: { challengeId, round, key } },
      create: { challengeId, round, key, winner, source: "manual" },
      update: { winner, source: "manual" },
    });
    saved.push(`${round}/${key}`);
  }

  return NextResponse.json({ saved });
}
