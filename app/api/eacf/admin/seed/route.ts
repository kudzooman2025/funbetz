/**
 * POST /api/eacf/admin/seed
 *
 * Bulk-create the dynasty roster: coach, season school, and optionally the
 * account plus invite. Idempotent — re-running updates rank and school and
 * skips anyone who already has an account, so a corrected list can be pasted
 * again without duplicating anything.
 *
 * Body: { seasonLabel, rows: [{ name, school?, email?, rank? }],
 *         sendInvites?: boolean, dryRun?: boolean }
 *
 * dryRun returns the plan without writing, so the admin sees exactly what
 * will happen — particularly which rows would send real email — before it does.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/eacf/admin";
import { createInvitedUser } from "@/lib/invite";

interface Row {
  name: string;
  school?: string;
  email?: string;
  rank?: number;
}

type Action =
  | "create coach"
  | "update coach"
  | "set school"
  | "invite"
  | "already has account"
  | "no email given";

interface RowResult {
  name: string;
  actions: Action[];
  error?: string;
  inviteUrl?: string;
  emailSent?: boolean;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    seasonLabel?: unknown;
    rows?: unknown;
    sendInvites?: unknown;
    dryRun?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const seasonLabel =
    typeof body.seasonLabel === "string" ? body.seasonLabel.trim() : "";
  const sendInvites = body.sendInvites === true;
  const dryRun = body.dryRun === true;

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "No rows to seed" }, { status: 400 });
  }

  const rows: Row[] = [];
  for (const raw of body.rows as unknown[]) {
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;
    rows.push({
      name,
      school: typeof r.school === "string" ? r.school.trim() : undefined,
      email:
        typeof r.email === "string" && r.email.includes("@")
          ? r.email.toLowerCase().trim()
          : undefined,
      rank: Number.isFinite(Number(r.rank)) ? Number(r.rank) : undefined,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No usable rows" }, { status: 400 });
  }
  if (rows.some((r) => r.school) && !seasonLabel) {
    return NextResponse.json(
      { error: "A season is required to set schools" },
      { status: 400 }
    );
  }

  const results: RowResult[] = [];

  for (const [i, row] of rows.entries()) {
    const actions: Action[] = [];
    // Line order is the ranking unless a rank was given explicitly.
    const rank = row.rank ?? i + 1;

    try {
      const existing = await prisma.eacfCoach.findUnique({
        where: { name: row.name },
        select: { id: true, userId: true, seedRank: true },
      });

      let coachId = existing?.id;

      if (!existing) {
        actions.push("create coach");
        if (!dryRun) {
          const created = await prisma.eacfCoach.create({
            data: { name: row.name, seedRank: rank },
            select: { id: true },
          });
          coachId = created.id;
        }
      } else if (existing.seedRank !== rank) {
        actions.push("update coach");
        if (!dryRun) {
          await prisma.eacfCoach.update({
            where: { id: existing.id },
            data: { seedRank: rank },
          });
        }
      }

      if (row.school) {
        actions.push("set school");
        if (!dryRun && coachId) {
          await prisma.eacfCoachSeason.upsert({
            where: { coachId_seasonLabel: { coachId, seasonLabel } },
            create: { coachId, seasonLabel, schoolName: row.school },
            update: { schoolName: row.school },
          });
        }
      }

      if (sendInvites) {
        if (existing?.userId) {
          actions.push("already has account");
        } else if (!row.email) {
          actions.push("no email given");
        } else {
          actions.push("invite");
          if (!dryRun && coachId) {
            const invited = await createInvitedUser(row.email, row.name);
            await prisma.eacfCoach.update({
              where: { id: coachId },
              data: { userId: invited.user.id },
            });
            results.push({
              name: row.name,
              actions,
              emailSent: invited.emailSent,
              inviteUrl: invited.emailSent ? undefined : invited.inviteUrl,
            });
            continue;
          }
        }
      }

      results.push({ name: row.name, actions });
    } catch (err) {
      // One bad row must not abandon the rest of the roster.
      results.push({
        name: row.name,
        actions,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  return NextResponse.json({ dryRun, seasonLabel, results });
}
