import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin guard for EACF routes.
 *
 * Duplicated from the shape used in app/api/admin/*; kept local rather than
 * refactoring those working routes mid-feature.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return session;
}

/** The season to operate on when the caller doesn't name one. */
export async function latestSeason(): Promise<string | null> {
  const week = await prisma.eacfWeek.findFirst({
    orderBy: [{ seasonLabel: "desc" }],
    select: { seasonLabel: true },
  });
  if (week) return week.seasonLabel;
  const season = await prisma.eacfCoachSeason.findFirst({
    orderBy: [{ seasonLabel: "desc" }],
    select: { seasonLabel: true },
  });
  return season?.seasonLabel ?? null;
}
