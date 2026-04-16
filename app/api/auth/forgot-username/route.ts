/**
 * POST /api/auth/forgot-username
 * Body: { email: string }
 *
 * Sends the user's username to their email address.
 * Always returns 200 to prevent email enumeration.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendUsernameReminderEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { username: true, email: true },
    });

    if (user) {
      try {
        await sendUsernameReminderEmail(user.email, user.username);
      } catch (err) {
        console.error("Failed to send username reminder email:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("forgot-username error:", err);
    return NextResponse.json({ success: true });
  }
}
