/**
 * GET /api/derby/results → public endpoint returning race result + user's pick/outcome
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DERBY_YEAR } from "@/lib/derby-config";

export async function GET() {
  const session = await auth();

  const result = await prisma.derbyResult.findUnique({
    where: { year: DERBY_YEAR },
  });

  let userPick = null;
  if (session?.user?.id) {
    userPick = await prisma.derbyPick.findUnique({
      where: { userId_year: { userId: session.user.id, year: DERBY_YEAR } },
    });
  }

  return NextResponse.json({ result, userPick });
}
