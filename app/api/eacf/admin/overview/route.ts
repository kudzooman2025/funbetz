/**
 * GET /api/eacf/admin/overview?season=2027
 *
 * Everything the EACF admin page renders: coaches with their season school,
 * linked account and latest team ratings; the season's weeks and games; and
 * the users not yet linked to a coach.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, latestSeason } from "@/lib/eacf/admin";

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") || (await latestSeason());

  const [coaches, weeks, linkedUserIds, seasonRows] = await Promise.all([
    prisma.eacfCoach.findMany({
      orderBy: { seedRank: "asc" },
      include: {
        user: { select: { id: true, username: true, email: true } },
        seasons: season ? { where: { seasonLabel: season } } : false,
        teamRatings: season
          ? {
              where: { seasonLabel: season },
              orderBy: [{ weekNumber: "desc" }, { capturedAt: "desc" }],
              take: 1,
            }
          : false,
      },
    }),
    season
      ? prisma.eacfWeek.findMany({
          where: { seasonLabel: season },
          orderBy: { weekNumber: "asc" },
          include: {
            games: {
              orderBy: { createdAt: "asc" },
              include: {
                homeCoach: { select: { id: true, name: true } },
                awayCoach: { select: { id: true, name: true } },
                _count: { select: { lineSubmissions: true, bets: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.eacfCoach.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
    }),
    prisma.eacfCoachSeason.findMany({
      distinct: ["seasonLabel"],
      select: { seasonLabel: true },
      orderBy: { seasonLabel: "desc" },
    }),
  ]);

  const taken = new Set(linkedUserIds.map((c) => c.userId));
  const availableUsers = await prisma.user.findMany({
    where: { id: { notIn: [...taken].filter((id): id is string => Boolean(id)) } },
    select: { id: true, username: true, email: true },
    orderBy: { username: "asc" },
  });

  return NextResponse.json({
    season,
    seasons: seasonRows.map((s) => s.seasonLabel),
    coaches: coaches.map((c) => ({
      id: c.id,
      name: c.name,
      seedRank: c.seedRank,
      user: c.user,
      school: Array.isArray(c.seasons) ? (c.seasons[0]?.schoolName ?? null) : null,
      ratings: Array.isArray(c.teamRatings)
        ? (c.teamRatings[0]
            ? {
                ovr: c.teamRatings[0].ovrRating,
                off: c.teamRatings[0].offRating,
                def: c.teamRatings[0].defRating,
                weekNumber: c.teamRatings[0].weekNumber,
              }
            : null)
        : null,
    })),
    weeks,
    availableUsers,
  });
}
