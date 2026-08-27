/**
 * GET  /api/admin/users  — list all users (admin only)
 * POST /api/admin/users  — create an account and email a set-password invite
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";

/** Invites last longer than a password reset — people check email on their own time. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: unknown; username?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters" },
      { status: 400 }
    );
  }

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (clash) {
    return NextResponse.json(
      {
        error:
          clash.email === email
            ? "That email already has an account"
            : "That username is taken",
      },
      { status: 409 }
    );
  }

  // The account is created without a usable password. The invitee sets their
  // own via the token below, so no password is ever generated, transmitted, or
  // known by anyone else — including the admin creating the account.
  const unusablePassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(unusablePassword, 12);

  const token = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      passwordResetTokens: {
        create: {
          token,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      },
    },
    select: { id: true, email: true, username: true, createdAt: true },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  try {
    await sendInviteEmail(user.email, user.username, inviteUrl);
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Hand the link back so the admin can pass it on another way rather than
    // being left with an account nobody can get into.
    return NextResponse.json({ user, emailSent: false, inviteUrl });
  }

  return NextResponse.json({ user, emailSent: true });
}
