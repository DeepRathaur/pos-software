/** UTC calendar day [start, end) for "today". */
export function getUtcTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** UTC range covering the last `days` calendar days including today (from start of first day to end of today). */
export function getUtcLastNDaysRange(days: number): { start: Date; end: Date } {
  const { end: tomorrow } = getUtcTodayRange();
  const start = new Date(tomorrow);
  start.setUTCDate(start.getUTCDate() - days);
  return { start, end: tomorrow };
}
