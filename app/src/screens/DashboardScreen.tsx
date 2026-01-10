import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { DRINK_CATEGORIES } from "../lib/drinks";
import {
  addDays,
  formatDuration,
  formatShortDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { countEntriesSince, getLastEntry, groupEntriesByCategory, groupEntriesByDate } from "../lib/stats";

const CATEGORY_COLORS: Record<string, string> = {
  beer: "#c59b49",
  wine: "#9b3b46",
  longdrink: "#4f8ea8",
  shot: "#6f7a4f",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CELL_SIZE = 12;
const CELL_GAP = 4;
const COLUMN_WIDTH = CELL_SIZE + CELL_GAP;

const formatVolume = (value: number) => {
  const trimmed = value.toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed} L`;
};

export default function DashboardScreen() {
  const { entries } = useEntries();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const todayCount = countEntriesSince(entries, todayStart);
  const weekCount = countEntriesSince(entries, weekStart);
  const monthCount = countEntriesSince(entries, monthStart);

  const lastEntry = getLastEntry(entries);
  const minutesSinceLast = lastEntry
    ? Math.max(0, Math.floor((now.getTime() - new Date(lastEntry.consumed_at).getTime()) / 60000))
    : null;

  const monthEntries = entries.filter(
    (entry) => new Date(entry.consumed_at).getTime() >= monthStart.getTime()
  );
  const categoryCounts = groupEntriesByCategory(monthEntries);
  const categoryTotal = Object.values(categoryCounts).reduce((acc, value) => acc + value, 0);
  const categoryVolumes = DRINK_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
    acc[category.key] = 0;
    return acc;
  }, {});
  for (const entry of monthEntries) {
    categoryVolumes[entry.category] += entry.size_l;
  }

  const countsByDate = useMemo(() => groupEntriesByDate(entries), [entries]);
  const volumeByDate = useMemo(() => {
    const totals: Record<string, { count: number; volume: number }> = {};
    for (const entry of entries) {
      const key = toDateKey(startOfDay(new Date(entry.consumed_at)));
      if (!totals[key]) {
        totals[key] = { count: 0, volume: 0 };
      }
      totals[key].count += 1;
      totals[key].volume += entry.size_l;
    }
    return totals;
  }, [entries]);

  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const gridStart = startOfWeek(yearStart);
  const gridEnd = addDays(startOfWeek(yearEnd), 6);
  const weeks: Date[] = [];
  let cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    weeks.push(new Date(cursor));
    cursor = addDays(cursor, 7);
  }

  const monthLabels = weeks.map((weekStartDate, index) => {
    const isFirst = index === 0;
    const prevMonth = isFirst ? null : weeks[index - 1].getMonth();
    const month = weekStartDate.getMonth();
    const isInYear = weekStartDate >= yearStart && weekStartDate <= yearEnd;
    const label =
      isInYear && (isFirst || month !== prevMonth)
        ? weekStartDate.toLocaleDateString("en-US", { month: "short" })
        : "";
    return { label, month, isInYear };
  });

  const targetMonth = year === now.getFullYear() ? now.getMonth() : 0;
  const currentMonthIndex = Math.max(
    0,
    weeks.findIndex(
      (weekStartDate) =>
        weekStartDate.getMonth() === targetMonth &&
        weekStartDate >= yearStart &&
        weekStartDate <= yearEnd
    )
  );

  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [didScroll, setDidScroll] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (didScroll || containerWidth === 0 || weeks.length === 0) return;
    const offset = Math.max(0, currentMonthIndex * COLUMN_WIDTH - containerWidth / 3);
    scrollRef.current?.scrollTo({ x: offset, animated: false });
    setDidScroll(true);
  }, [didScroll, containerWidth, weeks.length, currentMonthIndex]);

  useEffect(() => {
    setDidScroll(false);
    setSelectedKey(null);
  }, [year]);

  const handleTilePress = (date: Date) => {
    const key = toDateKey(date);
    const info = volumeByDate[key];
    const volume = info ? formatVolume(info.volume) : "0 L";
    const count = info?.count ?? 0;
    setSelectedKey(key);
    Alert.alert(formatShortDate(date), `${count} entries - ${volume}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Dashboard</Text>

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>{todayCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This week</Text>
            <Text style={styles.statValue}>{weekCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This month</Text>
            <Text style={styles.statValue}>{monthCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Since last</Text>
            <Text style={styles.statValue}>
              {minutesSinceLast === null ? "--" : formatDuration(minutesSinceLast)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Yearly overview</Text>
            <View style={styles.yearControls}>
              <Pressable style={styles.yearButton} onPress={() => setYear((prev) => prev - 1)}>
                <Text style={styles.yearButtonText}>{"<"}</Text>
              </Pressable>
              <Text style={styles.yearLabel}>{year}</Text>
              <Pressable style={styles.yearButton} onPress={() => setYear((prev) => prev + 1)}>
                <Text style={styles.yearButtonText}>{">"}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.heatmapWrapper}>
            <View style={styles.weekdayColumn}>
              <View style={styles.monthSpacer} />
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>
            <ScrollView
              horizontal
              ref={scrollRef}
              showsHorizontalScrollIndicator={false}
              onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
            >
              <View>
                <View style={styles.monthRow}>
                  {monthLabels.map((item, index) => {
                    const isCurrent = index === currentMonthIndex;
                    return (
                      <View key={`month-${index}`} style={styles.monthCell}>
                        <Text
                          style={[styles.monthLabel, isCurrent && styles.monthLabelActive]}
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.weeksRow}>
                  {weeks.map((weekStartDate) => (
                    <View key={weekStartDate.toISOString()} style={styles.weekColumn}>
                      {WEEKDAY_LABELS.map((_label, dayIndex) => {
                        const dayDate = addDays(weekStartDate, dayIndex);
                        const key = toDateKey(dayDate);
                        const inRange = dayDate >= yearStart && dayDate <= yearEnd;
                        const count = inRange ? countsByDate[key] ?? 0 : 0;
                        const color = !inRange
                          ? "#f2efea"
                          : count === 0
                          ? "#e7e2dd"
                          : count === 1
                          ? "#cfe1d6"
                          : count === 2
                          ? "#9ac2ad"
                          : "#4c8c71";
                        const isSelected = selectedKey === key;
                        return (
                          <Pressable
                            key={key}
                            style={[
                              styles.heatmapCell,
                              { backgroundColor: color },
                              isSelected && styles.heatmapSelected,
                              !inRange && styles.heatmapDisabled,
                            ]}
                            onPress={() => inRange && handleTilePress(dayDate)}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendLabel}>Less</Text>
            <View style={[styles.legendSwatch, { backgroundColor: "#e7e2dd" }]} />
            <View style={[styles.legendSwatch, { backgroundColor: "#cfe1d6" }]} />
            <View style={[styles.legendSwatch, { backgroundColor: "#9ac2ad" }]} />
            <View style={[styles.legendSwatch, { backgroundColor: "#4c8c71" }]} />
            <Text style={styles.legendLabel}>More</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category summary (this month)</Text>
          {DRINK_CATEGORIES.map((category) => {
            const count = categoryCounts[category.key];
            const percent = categoryTotal === 0 ? 0 : Math.round((count / categoryTotal) * 100);
            const liters = formatVolume(categoryVolumes[category.key] ?? 0);
            return (
              <View key={category.key} style={styles.chartRow}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>{category.label}</Text>
                  <Text style={styles.chartValue}>
                    {count} ({percent}%) - {liters}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${percent}%`, backgroundColor: CATEGORY_COLORS[category.key] },
                    ]}
                  />
                </View>
              </View>
            );
          })}
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
    gap: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece6e1",
    gap: 6,
  },
  statLabel: {
    color: "#6a645d",
    fontSize: 13,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  card: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yearControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  yearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0ebe6",
  },
  yearButtonText: {
    fontSize: 14,
    color: "#4b443d",
  },
  yearLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2b2724",
  },
  heatmapWrapper: {
    flexDirection: "row",
    gap: 8,
  },
  weekdayColumn: {
    alignItems: "flex-start",
  },
  monthSpacer: {
    height: 18,
  },
  weekdayLabel: {
    height: CELL_SIZE + CELL_GAP,
    fontSize: 10,
    color: "#8b847c",
  },
  monthRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  monthCell: {
    width: COLUMN_WIDTH,
  },
  monthLabel: {
    fontSize: 11,
    color: "#8b847c",
    minWidth: COLUMN_WIDTH * 2,
  },
  monthLabelActive: {
    color: "#1c6b4f",
    fontWeight: "700",
  },
  weeksRow: {
    flexDirection: "row",
  },
  weekColumn: {
    width: COLUMN_WIDTH,
    gap: CELL_GAP,
  },
  heatmapCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  heatmapSelected: {
    borderWidth: 1,
    borderColor: "#1c6b4f",
  },
  heatmapDisabled: {
    opacity: 0.45,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendLabel: {
    fontSize: 11,
    color: "#6a645d",
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  chartRow: {
    gap: 6,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLabel: {
    fontSize: 13,
    color: "#2b2724",
    fontWeight: "600",
  },
  chartValue: {
    fontSize: 12,
    color: "#6a645d",
  },
  barTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "#efe9e4",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
});
