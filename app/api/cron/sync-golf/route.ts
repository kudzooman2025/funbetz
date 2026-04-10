import { NextResponse } from "next/server";
import { syncGolfSchedule } from "@/lib/golf-sync";

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGolfSchedule(21);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

// Allow GET for easy browser testing
export async function GET(req: Request) {
  return POST(req);
}
