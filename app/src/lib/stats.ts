import { Entry, DrinkCategory } from "./types";
import { addDays, startOfDay, toDateKey, toLocalDayKeyFromISO } from "./dates";

export const countEntriesSince = (entries: Entry[], start: Date) => {
  const startTime = start.getTime();
  return entries.filter((entry) => new Date(entry.consumed_at).getTime() >= startTime).length;
};

export const getLastEntry = (entries: Entry[]) => entries[0] ?? null;

export const groupEntriesByDate = (entries: Entry[]) => {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const key = toLocalDayKeyFromISO(entry.consumed_at);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

export const groupEntriesByCategory = (entries: Entry[]) => {
  const counts: Record<DrinkCategory, number> = {
    beer: 0,
    wine: 0,
    sekt: 0,
    longdrink: 0,
    shot: 0,
    other: 0,
  };

  for (const entry of entries) {
    counts[entry.category] += 1;
  }

  return counts;
};

export const buildDailySeries = (start: Date, end: Date, counts: Record<string, number>) => {
  const series: Array<{ date: Date; count: number }> = [];
  const cursor = startOfDay(start);
  const endDay = startOfDay(end);

  while (cursor <= endDay) {
    const key = toDateKey(cursor);
    series.push({ date: new Date(cursor), count: counts[key] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
};

export const buildMonthSeries = (end: Date, months: number, entries: Entry[]) => {
  const series: Array<{ date: Date; count: number }> = [];
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthStart = new Date(endMonth.getFullYear(), endMonth.getMonth() - i, 1);
    const monthEnd = new Date(endMonth.getFullYear(), endMonth.getMonth() - i + 1, 0, 23, 59, 59);
    const count = entries.filter((entry) => {
      const value = new Date(entry.consumed_at);
      return value >= monthStart && value <= monthEnd;
    }).length;
    series.push({ date: monthStart, count });
  }

  return series;
};

export const buildWeekSeries = (end: Date, entries: Entry[]) => {
  const endDay = startOfDay(end);
  const startDay = addDays(endDay, -6);
  const counts = groupEntriesByDate(entries);
  return buildDailySeries(startDay, endDay, counts);
};
