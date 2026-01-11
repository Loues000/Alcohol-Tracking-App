import { addDays, startOfDay, toDateKey } from "./dates";
import { Entry, VolumeUnit } from "./types";

export const formatNumber = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(/\.?0+$/, "");

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const getGreeting = (hour: number) => {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const OUNCES_PER_LITER = 33.814;

export const formatVolume = (liters: number, unit: VolumeUnit) => {
  if (unit === "ml") {
    return `${Math.round(liters * 1000)} ml`;
  }

  if (unit === "cl") {
    return `${Math.round(liters * 100)} cl`;
  }

  if (unit === "oz") {
    return `${formatNumber(liters * OUNCES_PER_LITER, 1)} oz`;
  }

  return `${formatNumber(liters, 2)} L`;
};

export const formatDrinkCount = (count: number) =>
  `${count} drink${count === 1 ? "" : "s"}`;

export const calculateStreak = (
  entries: Entry[],
  countsByDate: Record<string, number>,
  todayStart: Date
) => {
  if (entries.length === 0) {
    return { mode: "dry" as const, days: 0, from: todayStart };
  }

  const todayKey = toDateKey(todayStart);
  const isDrinkingToday = (countsByDate[todayKey] ?? 0) > 0;
  const referenceDate = isDrinkingToday ? todayStart : addDays(todayStart, -1);
  const referenceKey = toDateKey(referenceDate);
  const mode = (countsByDate[referenceKey] ?? 0) > 0 ? ("drinking" as const) : ("dry" as const);

  const earliest = startOfDay(new Date(entries[entries.length - 1].consumed_at));
  let days = 0;
  let cursor = new Date(referenceDate);

  while (cursor.getTime() >= earliest.getTime()) {
    const key = toDateKey(cursor);
    const count = countsByDate[key] ?? 0;
    const matches = mode === "drinking" ? count > 0 : count === 0;
    if (!matches) break;
    days += 1;
    cursor = addDays(cursor, -1);
  }

  return { mode, days, from: addDays(referenceDate, -(Math.max(days, 1) - 1)) };
};
