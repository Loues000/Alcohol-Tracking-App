import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { DEFAULT_ABV, DRINK_CATEGORIES } from "../lib/drinks";
import { formatShortDate, startOfDay, toDateKey } from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { DrinkCategory, Entry } from "../lib/types";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CATEGORY_COLORS: Record<DrinkCategory, string> = {
  beer: "#c59b49",
  wine: "#9b3b46",
  sekt: "#d2b15a",
  longdrink: "#4f8ea8",
  shot: "#6f7a4f",
  other: "#8b7f7a",
};

const ETHANOL_GRAMS_PER_LITER = 789;
const STANDARD_DRINK_GRAMS = 12;

type SortDir = "asc" | "desc";
type MonthSortKey = "month" | "liters" | "drinkingDays";
type WeekdaySortKey = "weekday" | "liters" | "drinkingDays";

type MonthStats = {
  month: number;
  liters: number;
  percentOfYear: number;
  avgPerDay: number;
  drinkingDays: number;
  drinkingDaysPercent: number;
  maxLiters: number;
  maxDate: Date | null;
};

type WeekdayStats = {
  weekday: number;
  liters: number;
  avgPerDay: number;
  percentOfYear: number;
  drinkingDays: number;
  drinkingDaysPercent: number;
  maxLiters: number;
  maxDate: Date | null;
};

type QuarterStats = {
  label: string;
  liters: number;
};

const formatLiters = (value: number) => {
  const trimmed = value.toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed} L`;
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatGrams = (grams: number) => {
  if (grams < 1000) return `${Math.round(grams)} g`;
  const trimmed = (grams / 1000).toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed} kg`;
};

const parseDateKey = (key: string) => {
  const [yearValue, monthValue, dayValue] = key.split("-").map(Number);
  return new Date(yearValue, monthValue - 1, dayValue);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function CollapsibleCard({
  title,
  expanded,
  onToggle,
  children,
  right,
  wide,
}: {
  title: string;
  expanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
  right?: ReactNode;
  wide?: boolean;
}) {
  const isCollapsible = typeof expanded === "boolean" && typeof onToggle === "function";
  return (
    <View style={wide ? styles.cardWide : styles.card}>
      <Pressable
        style={[styles.cardHeader, !isCollapsible && styles.cardHeaderStatic]}
        onPress={onToggle}
        disabled={!isCollapsible}
      >
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{title}</Text>
          {isCollapsible ? (
            <FontAwesome name={expanded ? "chevron-up" : "chevron-down"} size={12} color="#6a645d" />
          ) : null}
        </View>
        {right ? <View style={styles.cardHeaderRight}>{right}</View> : null}
      </Pressable>
      {isCollapsible ? (expanded ? children : null) : children}
    </View>
  );
}

function SortHeaderCell({
  label,
  active,
  dir,
  onPress,
  rightAligned,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onPress: () => void;
  rightAligned?: boolean;
}) {
  const arrow = active ? (dir === "asc" ? "▲" : "▼") : "";
  return (
    <Pressable
      style={[styles.tableHeaderCell, rightAligned && styles.tableHeaderCellRight]}
      onPress={onPress}
      hitSlop={6}
    >
      <Text style={[styles.tableHeaderText, rightAligned && styles.cellRight]}>
        {label} {arrow}
      </Text>
    </Pressable>
  );
}

export default function DiagramsScreen() {
  const { entries } = useEntries();
  const now = new Date();
  const nowYear = now.getFullYear();
  const [year, setYear] = useState(nowYear);
  const [monthsExpanded, setMonthsExpanded] = useState(false);
  const [weekdaysExpanded, setWeekdaysExpanded] = useState(false);
  const [quartersExpanded, setQuartersExpanded] = useState(false);
  const [expandedMonthRows, setExpandedMonthRows] = useState<Record<number, boolean>>({});
  const [expandedWeekdayRows, setExpandedWeekdayRows] = useState<Record<number, boolean>>({});
  const [monthSort, setMonthSort] = useState<{ key: MonthSortKey; dir: SortDir }>({
    key: "month",
    dir: "asc",
  });
  const [weekdaySort, setWeekdaySort] = useState<{ key: WeekdaySortKey; dir: SortDir }>({
    key: "weekday",
    dir: "asc",
  });

  const yearBounds = useMemo(() => {
    const years = entries.map((entry) => new Date(entry.consumed_at).getFullYear());
    if (years.length === 0) return { min: nowYear, max: nowYear };
    const min = Math.min(...years, nowYear);
    const max = Math.max(...years, nowYear);
    return { min, max };
  }, [entries, nowYear]);

  useEffect(() => {
    setYear((prev) => clamp(prev, yearBounds.min, yearBounds.max));
  }, [yearBounds.max, yearBounds.min]);

  useEffect(() => {
    setExpandedMonthRows({});
    setExpandedWeekdayRows({});
  }, [year]);

  const changeYear = (delta: number) => {
    setYear((prev) => clamp(prev + delta, yearBounds.min, yearBounds.max));
  };

  const entriesForYear = useMemo(
    () => entries.filter((entry) => new Date(entry.consumed_at).getFullYear() === year),
    [entries, year]
  );

  const entriesByMonth = useMemo(() => {
    const months: Entry[][] = Array.from({ length: 12 }, () => []);
    entriesForYear.forEach((entry) => {
      const month = new Date(entry.consumed_at).getMonth();
      months[month].push(entry);
    });
    return months;
  }, [entriesForYear]);

  const dateTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entry of entriesForYear) {
      const key = toDateKey(startOfDay(new Date(entry.consumed_at)));
      totals[key] = (totals[key] ?? 0) + entry.size_l;
    }
    return totals;
  }, [entriesForYear]);

  const totalLiters = useMemo(
    () => entriesForYear.reduce((sum, entry) => sum + entry.size_l, 0),
    [entriesForYear]
  );

  const monthStats = useMemo(() => {
    return entriesByMonth.map((monthEntries, month) => {
      const liters = monthEntries.reduce((sum, entry) => sum + entry.size_l, 0);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const drinkingDays = new Set(
        monthEntries.map((entry) => toDateKey(startOfDay(new Date(entry.consumed_at))))
      ).size;

      const monthDayTotals: Record<string, number> = {};
      for (const entry of monthEntries) {
        const key = toDateKey(startOfDay(new Date(entry.consumed_at)));
        monthDayTotals[key] = (monthDayTotals[key] ?? 0) + entry.size_l;
      }
      let maxLiters = 0;
      let maxDate: Date | null = null;
      for (const [key, value] of Object.entries(monthDayTotals)) {
        if (value > maxLiters) {
          maxLiters = value;
          maxDate = parseDateKey(key);
        }
      }
      const percentOfYear = totalLiters === 0 ? 0 : (liters / totalLiters) * 100;
      const avgPerDay = daysInMonth === 0 ? 0 : liters / daysInMonth;
      const drinkingDaysPercent = daysInMonth === 0 ? 0 : (drinkingDays / daysInMonth) * 100;
      return {
        month,
        liters,
        percentOfYear,
        avgPerDay,
        drinkingDays,
        drinkingDaysPercent,
        maxLiters,
        maxDate,
      };
    });
  }, [entriesByMonth, totalLiters, year]);

  const weekdayStats = useMemo(() => {
    const stats: WeekdayStats[] = [];
    const weekdayOccurrences = Array(7).fill(0);

    const cursor = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    while (cursor <= end) {
      const weekdayIndex = (cursor.getDay() + 6) % 7;
      weekdayOccurrences[weekdayIndex] += 1;
      cursor.setDate(cursor.getDate() + 1);
    }

    for (let weekday = 0; weekday < 7; weekday += 1) {
      let liters = 0;
      let drinkingDays = 0;
      let maxLiters = 0;
      let maxDate: Date | null = null;

      for (const [key, value] of Object.entries(dateTotals)) {
        const date = parseDateKey(key);
        const weekdayIndex = (date.getDay() + 6) % 7;
        if (weekdayIndex !== weekday) continue;
        liters += value;
        drinkingDays += 1;
        if (value > maxLiters) {
          maxLiters = value;
          maxDate = date;
        }
      }

      const occurrences = weekdayOccurrences[weekday] || 1;
      const avgPerDay = liters / occurrences;
      const percentOfYear = totalLiters === 0 ? 0 : (liters / totalLiters) * 100;
      const drinkingDaysPercent = (drinkingDays / occurrences) * 100;

      stats.push({
        weekday,
        liters,
        avgPerDay,
        percentOfYear,
        drinkingDays,
        drinkingDaysPercent,
        maxLiters,
        maxDate,
      });
    }

    return stats;
  }, [dateTotals, totalLiters, year]);

  const quarterStats = useMemo(() => {
    const quarters: QuarterStats[] = [
      { label: "Q1", liters: 0 },
      { label: "Q2", liters: 0 },
      { label: "Q3", liters: 0 },
      { label: "Q4", liters: 0 },
    ];

    monthStats.forEach((month) => {
      const quarterIndex = Math.floor(month.month / 3);
      quarters[quarterIndex].liters += month.liters;
    });

    return quarters;
  }, [monthStats]);

  const maxQuarter = Math.max(1, ...quarterStats.map((quarter) => quarter.liters));

  const yearDrinkingDays = useMemo(() => Object.keys(dateTotals).length, [dateTotals]);

  const yearMaxDay = useMemo(() => {
    let maxLiters = 0;
    let maxDate: Date | null = null;
    for (const [key, value] of Object.entries(dateTotals)) {
      if (value > maxLiters) {
        maxLiters = value;
        maxDate = parseDateKey(key);
      }
    }
    return { maxLiters, maxDate };
  }, [dateTotals]);

  const daysInYear = useMemo(() => {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  }, [year]);

  const avgLitersPerDay = totalLiters === 0 ? 0 : totalLiters / daysInYear;
  const avgLitersPerDrinkingDay = yearDrinkingDays === 0 ? 0 : totalLiters / yearDrinkingDays;

  const topMonth = useMemo(() => {
    return monthStats.reduce<{ month: number; liters: number }>(
      (best, current) =>
        current.liters > best.liters ? { month: current.month, liters: current.liters } : best,
      { month: 0, liters: 0 }
    );
  }, [monthStats]);

  const topWeekday = useMemo(() => {
    return weekdayStats.reduce<{ weekday: number; liters: number }>(
      (best, current) =>
        current.liters > best.liters ? { weekday: current.weekday, liters: current.liters } : best,
      { weekday: 0, liters: 0 }
    );
  }, [weekdayStats]);

  const sortedMonthStats = useMemo(() => {
    const dir = monthSort.dir === "asc" ? 1 : -1;
    return [...monthStats].sort((a, b) => {
      const key = monthSort.key;
      const aValue = a[key];
      const bValue = b[key];
      if (aValue === bValue) return a.month - b.month;
      return aValue > bValue ? dir : -dir;
    });
  }, [monthSort.dir, monthSort.key, monthStats]);

  const sortedWeekdayStats = useMemo(() => {
    const dir = weekdaySort.dir === "asc" ? 1 : -1;
    return [...weekdayStats].sort((a, b) => {
      const key = weekdaySort.key;
      const aValue = a[key];
      const bValue = b[key];
      if (aValue === bValue) return a.weekday - b.weekday;
      return aValue > bValue ? dir : -dir;
    });
  }, [weekdaySort.dir, weekdaySort.key, weekdayStats]);

  const toggleMonthSort = (key: MonthSortKey) => {
    setMonthSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  };

  const toggleWeekdaySort = (key: WeekdaySortKey) => {
    setWeekdaySort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  };

  const categoryTotals = useMemo(() => {
    const totals = DRINK_CATEGORIES.reduce<Record<DrinkCategory, number>>((acc, category) => {
      acc[category.key] = 0;
      return acc;
    }, {} as Record<DrinkCategory, number>);
    for (const entry of entriesForYear) {
      totals[entry.category] += entry.size_l;
    }
    return totals;
  }, [entriesForYear]);

  const maxCategoryLiters = Math.max(1, ...Object.values(categoryTotals));

  const pureAlcoholGramsByMonth = useMemo(() => {
    const totals = Array.from({ length: 12 }, () => 0);
    for (const entry of entriesForYear) {
      const month = new Date(entry.consumed_at).getMonth();
      const abv =
        entry.category === "other"
          ? entry.abv_percent ?? DEFAULT_ABV.other ?? 10
          : DEFAULT_ABV[entry.category] ?? 0;
      const ethanolLiters = entry.size_l * (abv / 100);
      totals[month] += ethanolLiters * ETHANOL_GRAMS_PER_LITER;
    }
    return totals;
  }, [entriesForYear]);

  const pureAlcoholTotalGrams = useMemo(
    () => pureAlcoholGramsByMonth.reduce((sum, value) => sum + value, 0),
    [pureAlcoholGramsByMonth]
  );

  const maxPureAlcoholMonth = Math.max(1, ...pureAlcoholGramsByMonth);
  const standardDrinks = pureAlcoholTotalGrams / STANDARD_DRINK_GRAMS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Diagrams</Text>
          <View style={styles.yearSelector}>
            <Pressable
              style={[styles.yearButton, year <= yearBounds.min && styles.yearButtonDisabled]}
              onPress={() => changeYear(-1)}
              disabled={year <= yearBounds.min}
            >
              <Text style={styles.yearButtonText}>{"<"}</Text>
            </Pressable>
            <View style={styles.yearPill}>
              <FontAwesome name="calendar" size={14} color="#2b2724" />
              <Text style={styles.yearPillText}>{year}</Text>
            </View>
            <Pressable
              style={[styles.yearButton, year >= yearBounds.max && styles.yearButtonDisabled]}
              onPress={() => changeYear(1)}
              disabled={year >= yearBounds.max}
            >
              <Text style={styles.yearButtonText}>{">"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.grid}>
          <CollapsibleCard
            title="Year Summary"
            wide
            right={
              entriesForYear.length === 0 ? (
                <Text style={styles.summarySubtitle}>No entries for this year.</Text>
              ) : (
                <Text style={styles.summarySubtitle}>
                  Top month: {MONTH_LABELS[topMonth.month]} - Top weekday: {WEEKDAY_LABELS_SHORT[topWeekday.weekday]}
                </Text>
              )
            }
          >
            <View style={styles.summaryGrid}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{formatLiters(totalLiters)}</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Drinking days</Text>
                <Text style={styles.summaryValue}>{yearDrinkingDays}</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Avg / day</Text>
                <Text style={styles.summaryValue}>{formatLiters(avgLitersPerDay)}</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Avg / drinking day</Text>
                <Text style={styles.summaryValue}>{formatLiters(avgLitersPerDrinkingDay)}</Text>
              </View>
              <View style={styles.summaryTileWide}>
                <Text style={styles.summaryLabel}>Max day</Text>
                <Text style={styles.summaryValue}>
                  {yearMaxDay.maxDate
                    ? `${formatLiters(yearMaxDay.maxLiters)} - ${formatShortDate(yearMaxDay.maxDate)}`
                    : "0 L"}
                </Text>
              </View>
            </View>
          </CollapsibleCard>

          <CollapsibleCard
            title="Months"
            wide
            expanded={monthsExpanded}
            onToggle={() => setMonthsExpanded((prev) => !prev)}
          >
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <SortHeaderCell
                  label="Month"
                  active={monthSort.key === "month"}
                  dir={monthSort.dir}
                  onPress={() => toggleMonthSort("month")}
                />
                <SortHeaderCell
                  label="Liters"
                  active={monthSort.key === "liters"}
                  dir={monthSort.dir}
                  onPress={() => toggleMonthSort("liters")}
                  rightAligned
                />
                <SortHeaderCell
                  label="Days"
                  active={monthSort.key === "drinkingDays"}
                  dir={monthSort.dir}
                  onPress={() => toggleMonthSort("drinkingDays")}
                  rightAligned
                />
              </View>

              {sortedMonthStats.map((month) => {
                const expanded = !!expandedMonthRows[month.month];
                return (
                  <View key={month.month}>
                    <Pressable
                      style={[styles.tableRow, expanded && styles.tableRowExpanded]}
                      onPress={() =>
                        setExpandedMonthRows((prev) => ({ ...prev, [month.month]: !prev[month.month] }))
                      }
                    >
                      <Text style={styles.tableCell}>{MONTH_LABELS[month.month]}</Text>
                      <Text style={[styles.tableCell, styles.cellRight]}>{formatLiters(month.liters)}</Text>
                      <Text style={[styles.tableCell, styles.cellRight]}>
                        {month.drinkingDays} ({formatPercent(month.drinkingDaysPercent)})
                      </Text>
                    </Pressable>

                    {expanded ? (
                      <View style={styles.rowDetails}>
                        <Text style={styles.rowDetailLine}>Share: {formatPercent(month.percentOfYear)}</Text>
                        <Text style={styles.rowDetailLine}>Avg/day: {formatLiters(month.avgPerDay)}</Text>
                        <Text style={styles.rowDetailLine}>
                          Max day:{" "}
                          {month.maxDate
                            ? `${formatLiters(month.maxLiters)} - ${formatShortDate(month.maxDate)}`
                            : "0 L"}
                        </Text>
                        <Text style={styles.rowDetailLine}>
                          Drinking days: {month.drinkingDays} ({formatPercent(month.drinkingDaysPercent)})
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </CollapsibleCard>

          <CollapsibleCard
            title="Weekdays"
            expanded={weekdaysExpanded}
            onToggle={() => setWeekdaysExpanded((prev) => !prev)}
          >
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <SortHeaderCell
                  label="Weekday"
                  active={weekdaySort.key === "weekday"}
                  dir={weekdaySort.dir}
                  onPress={() => toggleWeekdaySort("weekday")}
                />
                <SortHeaderCell
                  label="Liters"
                  active={weekdaySort.key === "liters"}
                  dir={weekdaySort.dir}
                  onPress={() => toggleWeekdaySort("liters")}
                  rightAligned
                />
                <SortHeaderCell
                  label="Days"
                  active={weekdaySort.key === "drinkingDays"}
                  dir={weekdaySort.dir}
                  onPress={() => toggleWeekdaySort("drinkingDays")}
                  rightAligned
                />
              </View>

              {sortedWeekdayStats.map((day) => {
                const expanded = !!expandedWeekdayRows[day.weekday];
                return (
                  <View key={day.weekday}>
                    <Pressable
                      style={[styles.tableRow, expanded && styles.tableRowExpanded]}
                      onPress={() =>
                        setExpandedWeekdayRows((prev) => ({ ...prev, [day.weekday]: !prev[day.weekday] }))
                      }
                    >
                      <Text style={styles.tableCell}>{WEEKDAY_LABELS_SHORT[day.weekday]}</Text>
                      <Text style={[styles.tableCell, styles.cellRight]}>{formatLiters(day.liters)}</Text>
                      <Text style={[styles.tableCell, styles.cellRight]}>
                        {day.drinkingDays} ({formatPercent(day.drinkingDaysPercent)})
                      </Text>
                    </Pressable>

                    {expanded ? (
                      <View style={styles.rowDetails}>
                        <Text style={styles.rowDetailLine}>Weekday: {WEEKDAY_LABELS[day.weekday]}</Text>
                        <Text style={styles.rowDetailLine}>Share: {formatPercent(day.percentOfYear)}</Text>
                        <Text style={styles.rowDetailLine}>Avg/day: {formatLiters(day.avgPerDay)}</Text>
                        <Text style={styles.rowDetailLine}>
                          Drinking days: {day.drinkingDays} ({formatPercent(day.drinkingDaysPercent)})
                        </Text>
                        <Text style={styles.rowDetailLine}>
                          Max day:{" "}
                          {day.maxDate
                            ? `${formatLiters(day.maxLiters)} - ${formatShortDate(day.maxDate)}`
                            : "0 L"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </CollapsibleCard>

          <CollapsibleCard
            title="Quarters"
            expanded={quartersExpanded}
            onToggle={() => setQuartersExpanded((prev) => !prev)}
          >
            <View style={styles.quarterList}>
              {quarterStats.map((quarter) => {
                const width = maxQuarter === 0 ? 0 : (quarter.liters / maxQuarter) * 100;
                return (
                  <View key={quarter.label} style={styles.quarterRow}>
                    <Text style={styles.quarterLabel}>{quarter.label}</Text>
                    <View style={styles.quarterBarTrack}>
                      <View style={[styles.quarterBarFill, { width: `${width}%` }]} />
                    </View>
                    <Text style={styles.quarterValue}>{formatLiters(quarter.liters)}</Text>
                  </View>
                );
              })}
            </View>
          </CollapsibleCard>

          <CollapsibleCard title="Drink Mix" wide>
            <View style={styles.quarterList}>
              {DRINK_CATEGORIES.filter((category) => categoryTotals[category.key] > 0).map((category) => {
                const liters = categoryTotals[category.key];
                const width = maxCategoryLiters === 0 ? 0 : (liters / maxCategoryLiters) * 100;
                return (
                  <View key={category.key} style={styles.quarterRow}>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                    <View style={styles.quarterBarTrack}>
                      <View
                        style={[
                          styles.quarterBarFill,
                          { width: `${width}%`, backgroundColor: CATEGORY_COLORS[category.key] },
                        ]}
                      />
                    </View>
                    <Text style={styles.quarterValue}>{formatLiters(liters)}</Text>
                  </View>
                );
              })}
              {entriesForYear.length === 0 ? <Text style={styles.emptyNote}>No entries for this year.</Text> : null}
            </View>
          </CollapsibleCard>

          <CollapsibleCard
            title="Pure Alcohol"
            wide
            right={
              <Text style={styles.summarySubtitle}>
                {formatGrams(pureAlcoholTotalGrams)} - {standardDrinks.toFixed(1)} standard drinks (12 g)
              </Text>
            }
          >
            <View style={styles.miniBars}>
              {pureAlcoholGramsByMonth.map((value, month) => {
                const height = maxPureAlcoholMonth === 0 ? 0 : (value / maxPureAlcoholMonth) * 44;
                return (
                  <View key={month} style={styles.miniBarItem}>
                    <View style={[styles.miniBar, { height }]} />
                    <Text style={styles.miniBarLabel}>{MONTH_LABELS[month]}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.pureAlcoholHint}>
              Uses entry ABV when available, otherwise a default per category.
            </Text>
          </CollapsibleCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4ef",
  },
  container: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  yearSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  yearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ece7e2",
  },
  yearButtonDisabled: {
    opacity: 0.4,
  },
  yearButtonText: {
    fontSize: 14,
    color: "#4b443d",
  },
  yearPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ece6e1",
  },
  yearPillText: {
    color: "#2b2724",
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    flexGrow: 1,
    minWidth: 280,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece6e1",
    gap: 12,
  },
  cardWide: {
    flexGrow: 2,
    minWidth: 320,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece6e1",
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderStatic: {
    paddingBottom: 2,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardHeaderRight: {
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2b2724",
  },
  summarySubtitle: {
    color: "#6a645d",
    fontSize: 12,
    textAlign: "right",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryTile: {
    flexGrow: 1,
    minWidth: 150,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe9e4",
    backgroundColor: "#fbfaf8",
    gap: 6,
  },
  summaryTileWide: {
    flexGrow: 1,
    minWidth: 310,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe9e4",
    backgroundColor: "#fbfaf8",
    gap: 6,
  },
  summaryLabel: {
    color: "#6a645d",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#2b2724",
    fontSize: 16,
    fontWeight: "700",
  },
  table: {
    gap: 6,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0ebe6",
  },
  tableRowExpanded: {
    backgroundColor: "#fbfaf8",
    borderBottomColor: "#efe9e4",
  },
  tableHeaderRow: {
    borderBottomColor: "#ded8d1",
  },
  tableHeaderCell: {
    flex: 1,
  },
  tableHeaderCellRight: {
    alignItems: "flex-end",
  },
  tableCell: {
    flex: 1,
    color: "#3f3a35",
    fontSize: 12,
  },
  tableHeaderText: {
    color: "#6a645d",
    fontWeight: "600",
  },
  cellRight: {
    textAlign: "right",
  },
  rowDetails: {
    paddingBottom: 8,
    paddingTop: 2,
    paddingHorizontal: 6,
    gap: 3,
  },
  rowDetailLine: {
    color: "#6a645d",
    fontSize: 12,
  },
  quarterList: {
    gap: 10,
  },
  quarterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quarterLabel: {
    width: 26,
    fontWeight: "600",
    color: "#2b2724",
  },
  categoryLabel: {
    width: 130,
    fontWeight: "600",
    color: "#2b2724",
    fontSize: 12,
  },
  quarterBarTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#efe9e4",
    overflow: "hidden",
  },
  quarterBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#eaa01f",
  },
  quarterValue: {
    width: 70,
    textAlign: "right",
    fontSize: 12,
    color: "#2b2724",
    fontWeight: "600",
  },
  emptyNote: {
    color: "#6a645d",
    fontSize: 12,
    paddingTop: 4,
  },
  miniBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
    paddingTop: 6,
  },
  miniBarItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  miniBar: {
    width: "100%",
    maxWidth: 18,
    minHeight: 2,
    borderRadius: 6,
    backgroundColor: "#1c6b4f",
  },
  miniBarLabel: {
    color: "#8a837b",
    fontSize: 9,
  },
  pureAlcoholHint: {
    color: "#8a837b",
    fontSize: 12,
  },
});
