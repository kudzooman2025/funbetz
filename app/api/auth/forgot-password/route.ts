/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Looks up the user by email, creates a reset token, and sends an email.
 * Always returns 200 (to prevent email enumeration).
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: true }); // silent
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, username: true, email: true },
    });

    if (user) {
      // Invalidate any existing tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(user.email, user.username, resetUrl);
      } catch (err) {
        console.error("Failed to send password reset email:", err);
      }
    }

    // Always return success to avoid email enumeration
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ success: true });
  }
}
