/**
 * POST /api/eacf/admin/coaches — add a coach to the dynasty.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/eacf/admin";

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: unknown; seedRank?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const seedRank = Number(body.seedRank);

  if (!name) {
    return NextResponse.json({ error: "Coach name is required" }, { status: 400 });
  }
  if (!Number.isInteger(seedRank) || seedRank < 1) {
    return NextResponse.json(
      { error: "Seed rank must be a positive whole number" },
      { status: 400 }
    );
  }

  const existing = await prisma.eacfCoach.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "That coach already exists" }, { status: 409 });
  }

  const coach = await prisma.eacfCoach.create({ data: { name, seedRank } });
  return NextResponse.json({ coach });
}
