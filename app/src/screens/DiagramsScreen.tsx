import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { formatShortDate, startOfDay, toDateKey } from "../lib/dates";
import { useEntries } from "../lib/entries-context";

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

type MonthStats = {
  month: number;
  liters: number;
  percentOfYear: number;
  avgPerDay: number;
  drinkingDays: number;
  drinkingDaysPercent: number;
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

export default function DiagramsScreen() {
  const { entries } = useEntries();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const entriesForYear = useMemo(
    () => entries.filter((entry) => new Date(entry.consumed_at).getFullYear() === year),
    [entries, year]
  );

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
    const months: MonthStats[] = [];
    for (let month = 0; month < 12; month += 1) {
      const monthEntries = entriesForYear.filter(
        (entry) => new Date(entry.consumed_at).getMonth() === month
      );
      const liters = monthEntries.reduce((sum, entry) => sum + entry.size_l, 0);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const drinkingDays = new Set(
        monthEntries.map((entry) =>
          toDateKey(startOfDay(new Date(entry.consumed_at)))
        )
      ).size;
      const percentOfYear = totalLiters === 0 ? 0 : (liters / totalLiters) * 100;
      const avgPerDay = daysInMonth === 0 ? 0 : liters / daysInMonth;
      const drinkingDaysPercent = daysInMonth === 0 ? 0 : (drinkingDays / daysInMonth) * 100;

      months.push({
        month,
        liters,
        percentOfYear,
        avgPerDay,
        drinkingDays,
        drinkingDaysPercent,
      });
    }
    return months;
  }, [entriesForYear, totalLiters, year]);

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
        const [yearValue, monthValue, dayValue] = key.split("-").map(Number);
        const date = new Date(yearValue, monthValue - 1, dayValue);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Tabellen</Text>
          <View style={styles.yearSelector}>
            <Pressable style={styles.yearButton} onPress={() => setYear((prev) => prev - 1)}>
              <Text style={styles.yearButtonText}>{"<"}</Text>
            </Pressable>
            <View style={styles.yearPill}>
              <FontAwesome name="calendar" size={14} color="#2b2724" />
              <Text style={styles.yearPillText}>{year}</Text>
            </View>
            <Pressable style={styles.yearButton} onPress={() => setYear((prev) => prev + 1)}>
              <Text style={styles.yearButtonText}>{">"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.cardWide}>
            <Text style={styles.cardTitle}>Months</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Month</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>Liters</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>% of year</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>Avg/day</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>Drinking days</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>EUR</Text>
              </View>
              {monthStats.map((month) => (
                <View key={month.month} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{MONTH_LABELS[month.month]}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>{formatLiters(month.liters)}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>{formatPercent(month.percentOfYear)}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>{formatLiters(month.avgPerDay)}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>
                    {month.drinkingDays} ({formatPercent(month.drinkingDaysPercent)})
                  </Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>0.00</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekdays</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Weekday</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>Total</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>Avg</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>Share</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>
                  Drinking days (%)
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.cellRight]}>Maximum</Text>
              </View>
              {weekdayStats.map((day) => (
                <View key={day.weekday} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{WEEKDAY_LABELS[day.weekday]}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>{formatLiters(day.liters)}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>{formatLiters(day.avgPerDay)}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>{formatPercent(day.percentOfYear)}</Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>
                    {day.drinkingDays} ({formatPercent(day.drinkingDaysPercent)})
                  </Text>
                  <Text style={[styles.tableCell, styles.cellRight]}>
                    {day.maxDate
                      ? `${formatLiters(day.maxLiters)}\n${formatShortDate(day.maxDate)}`
                      : "0.00 L"}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quarters</Text>
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
          </View>
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2b2724",
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
  tableHeaderRow: {
    borderBottomColor: "#ded8d1",
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
});
