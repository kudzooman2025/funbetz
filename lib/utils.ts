import { GAME_BUFFER_HOURS } from "./constants";

/**
 * Returns the betting window: now + buffer through end of next Sunday.
 * If today is Sunday, extends to end of the FOLLOWING Sunday.
 */
export function getBettingWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getTime() + GAME_BUFFER_HOURS * 60 * 60 * 1000);

  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;

  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + daysUntilNextSunday);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
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
