import { GAME_BUFFER_HOURS } from "./constants";

/**
 * Returns the betting window: now + buffer through the end of the current
 * betting week.
 *
 * The week boundary is Tuesday 07:59:59 UTC (~3–4am ET), so the window always
 * covers a full football week — Thursday Night Football through the end of
 * Monday Night Football (which can run past midnight ET / 05:00 UTC Tuesday).
 * The previous Sunday-23:59-UTC boundary cut off SNF and MNF (~7:59pm ET).
 */
export function getBettingWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getTime() + GAME_BUFFER_HOURS * 60 * 60 * 1000);

  const end = new Date(now);
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 2 = Tuesday
  let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  // If it's already Tuesday past the boundary, roll to next week's Tuesday
  if (daysUntilTuesday === 0 && now.getUTCHours() >= 8) daysUntilTuesday = 7;
  end.setUTCDate(now.getUTCDate() + daysUntilTuesday);
  end.setUTCHours(7, 59, 59, 999);

  return { start, end };
}

/**
 * "Fri 8:00 PM ET" — the compact kickoff slot used on game cards and ticket
 * legs. Distinct from formatGameTime, which includes the calendar date.
 */
export function formatKickoffSlot(date: string | Date): string {
  const d = new Date(date);
  return (
    d
      .toLocaleString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "") + " ET"
  );
}

/**
 * Format a date for display in EST timezone.
 */
export function formatGameTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date as relative time (e.g., "in 2 hours", "yesterday").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 60) {
    return diffMins > 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }
  return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
}

/**
 * Classnames helper (simple version).
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
