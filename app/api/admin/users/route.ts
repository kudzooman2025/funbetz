/**
 * GET /api/admin/users
 * Returns all users (admin only).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      walletBalance: true,
      bracketEntries: {
        select: { score: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}
