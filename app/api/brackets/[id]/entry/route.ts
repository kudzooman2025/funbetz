import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BracketPicks } from "@/lib/bracket-config";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.bracketEntry.findUnique({
    where: { userId_challengeId: { userId: session.user.id, challengeId: id } },
  });

  return NextResponse.json(entry ?? null);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check bracket exists and isn't locked
  const challenge = await prisma.bracketChallenge.findUnique({ where: { id } });
  if (!challenge) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }
  if (new Date() >= challenge.lockTime) {
    return NextResponse.json(
      { error: "Bracket is locked — picks closed at kickoff" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const picks: BracketPicks = body.picks;

  if (!picks || typeof picks !== "object") {
    return NextResponse.json({ error: "Invalid picks" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const picksJson = picks as any;
  const entry = await prisma.bracketEntry.upsert({
    where: { userId_challengeId: { userId: session.user.id, challengeId: id } },
    create: { userId: session.user.id, challengeId: id, picks: picksJson },
    update: { picks: picksJson },
  });

  return NextResponse.json(entry);
}
