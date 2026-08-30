/**
 * Date and Week Utilities for Valeria
 * Strict local calendar time calculations to prevent UTC timezone date-shifting.
 */

/**
 * Format a Date object to 'YYYY-MM-DD' using local calendar date values.
 */
export const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse a 'YYYY-MM-DD' string into a local Date object set to 00:00:00.000 local time.
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

/**
 * Calculate the current (or reference) week's Monday-to-Sunday boundaries in local calendar time.
 */
export const getWeekBounds = (referenceDate = new Date()) => {
  const dayOfWeek = referenceDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Monday 00:00:00.000 in local time
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - diffToMonday,
    0, 0, 0, 0
  );

  // Sunday 23:59:59.999 in local time (6 days after Monday)
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
    23, 59, 59, 999
  );

  const weekStart = formatLocalDate(monday);
  const weekEnd = formatLocalDate(sunday);

  // ISO Week ID (e.g. "2026-W35")
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const weekId = `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  return {
    monday,
    sunday,
    weekStart,
    weekEnd,
    weekId
  };
};

export interface WeekDayInfo {
  offset: number;
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayName: string; // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  monthDay: string; // "Aug 24", "Aug 29"
}

/**
 * Return exactly 7 local calendar days for the week starting at weekStartStr (YYYY-MM-DD).
 */
export const get7DaysOfWeek = (weekStartStr: string): WeekDayInfo[] => {
  const startMonday = parseLocalDate(weekStartStr);
  const days: WeekDayInfo[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const currentDay = new Date(
      startMonday.getFullYear(),
      startMonday.getMonth(),
      startMonday.getDate() + offset,
      0, 0, 0, 0
    );

    days.push({
      offset,
      date: currentDay,
      dateStr: formatLocalDate(currentDay),
      dayName: currentDay.toLocaleDateString('en-US', { weekday: 'short' }),
      monthDay: currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }

  return days;
};
