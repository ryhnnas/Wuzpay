const TIMEZONE = (globalThis as any).process?.env?.TZ ||
  (typeof Deno !== "undefined" ? Deno.env.get("TZ") : null) || "Asia/Jakarta";

export function getGlobalTimezone() {
  return TIMEZONE;
}

export function getDateRange(
  period: string,
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  if (period === "custom" && startDate && endDate) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    return {
      start: new Date(sy, sm - 1, sd),
      end: new Date(ey, em - 1, ed + 1), // +1 hari supaya inclusive
    };
  }

  switch (period) {
    case "today":
      return { start: todayStart, end: todayEnd };
    case "week":
      return {
        start: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: todayEnd,
      };
    case "month":
    default:
      return {
        start: new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: todayEnd,
      };
  }
}
