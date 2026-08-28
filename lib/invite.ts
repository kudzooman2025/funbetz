import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";

/** Invites last longer than a password reset — people check email on their own time. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface InviteResult {
  user: { id: string; email: string; username: string };
  inviteUrl: string;
  emailSent: boolean;
}

/**
 * Create an account nobody can log into yet, and issue a set-your-password
 * link. No password is ever generated, transmitted, or known by anyone —
 * including whoever is creating the account.
 *
 * Throws on a duplicate email or username; callers decide how to report it.
 */
export async function createInvitedUser(
  email: string,
  username: string
): Promise<InviteResult> {
  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true },
  });
  if (clash) {
    throw new Error(
      clash.email === email
        ? "That email already has an account"
        : "That username is taken"
    );
  }

  const unusablePassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(unusablePassword, 12);
  const token = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      passwordResetTokens: {
        create: { token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      },
    },
    select: { id: true, email: true, username: true },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  try {
    await sendInviteEmail(user.email, user.username, inviteUrl);
    return { user, inviteUrl, emailSent: true };
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Hand the link back rather than leaving an account nobody can get into.
    return { user, inviteUrl, emailSent: false };
  }
}
