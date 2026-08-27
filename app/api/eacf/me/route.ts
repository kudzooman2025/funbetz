/**
 * GET /api/eacf/me
 *
 * Whether the signed-in user belongs to the dynasty, plus the current week.
 * Membership is EacfCoach.userId being set — the same check that gates the
 * EACF pages, so the dashboard never advertises something a user can't open.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ isMember: false, isAdmin: false });
  }

  const [coach, user] = await Promise.all([
    prisma.eacfCoach.findUnique({
      where: { userId: session.user.id },
      select: { id: true, name: true, seedRank: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    }),
  ]);

  const isAdmin = Boolean(user?.isAdmin);
  const isMember = Boolean(coach);

  if (!isMember && !isAdmin) {
    return NextResponse.json({ isMember: false, isAdmin: false });
  }

  const week = await prisma.eacfWeek.findFirst({
    orderBy: [{ seasonLabel: "desc" }, { weekNumber: "desc" }],
    include: {
      games: {
        orderBy: { createdAt: "asc" },
        include: {
          homeCoach: { select: { id: true, name: true } },
          awayCoach: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Schools are season-scoped, so resolve them for this week's season only.
  const schools = week
    ? await prisma.eacfCoachSeason.findMany({
        where: { seasonLabel: week.seasonLabel },
        select: { coachId: true, schoolName: true },
      })
    : [];
  const schoolBy = new Map(schools.map((s) => [s.coachId, s.schoolName]));

  return NextResponse.json({
    isMember,
    isAdmin,
    coach,
    week: week
      ? {
          seasonLabel: week.seasonLabel,
          weekNumber: week.weekNumber,
          status: week.status,
          games: week.games.map((g) => ({
            id: g.id,
            status: g.status,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            publishedLine: g.publishedLine,
            currentLine: g.currentLine,
            home: {
              id: g.homeCoach.id,
              name: g.homeCoach.name,
              school: schoolBy.get(g.homeCoach.id) ?? null,
            },
            away: {
              id: g.awayCoach.id,
              name: g.awayCoach.name,
              school: schoolBy.get(g.awayCoach.id) ?? null,
            },
            // A coach never sets a line on, or bets, their own game.
            isYours:
              coach != null &&
              (g.homeCoach.id === coach.id || g.awayCoach.id === coach.id),
          })),
        }
      : null,
  });
}
