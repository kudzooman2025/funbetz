/** League dates are calendar dates in UTC, including the entire final day. */
export function parseLeagueDate(value: unknown): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(NaN);
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : new Date(NaN);
}

/** Works for existing midnight end dates too; no historical data rewrite needed. */
export function leagueEndExclusive(endDate: Date): Date {
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}
