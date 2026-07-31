import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePendingParlays } from "@/lib/resolve-parlays";

export async function POST(req: Request) {
  // Verify cron secret. Fail CLOSED when the env var is missing — otherwise
  // "Bearer undefined" would authenticate.
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await resolvePendingParlays(prisma);
  return NextResponse.json(results);
}

export async function GET(req: Request) {
  return POST(req);
}
