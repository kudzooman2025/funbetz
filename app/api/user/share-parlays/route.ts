import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Read the current sharing preference. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { shareParlays: true },
  });

  return NextResponse.json({ shareParlays: user?.shareParlays ?? false });
}

/**
 * Turn parlay-card sharing on or off. Opt-in by default-off: nobody's picks
 * become visible to their league until they choose it, and they can turn it
 * back off at any time.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { shareParlays?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.shareParlays !== "boolean") {
    return NextResponse.json(
      { error: "shareParlays must be true or false." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { shareParlays: body.shareParlays },
    select: { shareParlays: true },
  });

  return NextResponse.json(updated);
}
