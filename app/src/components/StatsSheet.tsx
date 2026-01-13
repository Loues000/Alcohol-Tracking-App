import { useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { getEntryEthanolGrams } from "../lib/alcohol";
import { DRINK_CATEGORIES } from "../lib/drinks";
import { CATEGORY_COLORS } from "../lib/dashboard-theme";
import { formatVolume } from "../lib/dashboard-utils";
import { toLocalDayKeyFromISO } from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { useLocalSettings } from "../lib/local-settings";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";
import { DrinkCategory } from "../lib/types";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;

export default function StatsSheet({ visible, onClose }: Props) {
  const { entries } = useEntries();
  const { settings } = useLocalSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);

  const entriesForYear = useMemo(
    () => entries.filter((entry) => new Date(entry.consumed_at).getFullYear() === year),
    [entries, year]
  );

  // Overview stats
  const overviewStats = useMemo(() => {
    const totalLiters = entriesForYear.reduce((sum, e) => sum + e.size_l, 0);
    const dateTotals: Record<string, number> = {};
    for (const entry of entriesForYear) {
      const key = toLocalDayKeyFromISO(entry.consumed_at);
      dateTotals[key] = (dateTotals[key] ?? 0) + entry.size_l;
    }
    const drinkingDays = Object.keys(dateTotals).length;
    const daysInYear = year === currentYear
      ? Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (24 * 60 * 60 * 1000))
      : 365;
    const avgPerDay = daysInYear > 0 ? totalLiters / daysInYear : 0;
    const avgPerDrinkingDay = drinkingDays > 0 ? totalLiters / drinkingDays : 0;

    let maxLiters = 0;
    let maxDate = "";
    for (const [key, value] of Object.entries(dateTotals)) {
      if (value > maxLiters) {
        maxLiters = value;
        maxDate = key;
      }
    }

    return { totalLiters, drinkingDays, avgPerDay, avgPerDrinkingDay, maxLiters, maxDate, entryCount: entriesForYear.length };
  }, [entriesForYear, year, currentYear, now]);

  // Weekday stats
  const weekdayStats = useMemo(() => {
    const stats = Array.from({ length: 7 }, () => ({ liters: 0, count: 0 }));
    for (const entry of entriesForYear) {
      const date = new Date(entry.consumed_at);
      const weekdayIndex = (date.getDay() + 6) % 7; // Monday = 0
      stats[weekdayIndex].liters += entry.size_l;
      stats[weekdayIndex].count += 1;
    }
    const maxLiters = Math.max(...stats.map((s) => s.liters), 1);
    return stats.map((s, i) => ({
      label: WEEKDAY_LABELS[i],
      liters: s.liters,
      count: s.count,
      percent: (s.liters / maxLiters) * 100,
    }));
  }, [entriesForYear]);

  // Category stats
  const categoryStats = useMemo(() => {
    const totals: Record<DrinkCategory, number> = {} as Record<DrinkCategory, number>;
    for (const cat of DRINK_CATEGORIES) {
      totals[cat.key] = 0;
    }
    for (const entry of entriesForYear) {
      totals[entry.category] += entry.size_l;
    }
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    const maxLiters = Math.max(...Object.values(totals), 1);

    return DRINK_CATEGORIES.map((cat) => ({
      key: cat.key,
      label: cat.label,
      liters: totals[cat.key],
      percent: total > 0 ? (totals[cat.key] / total) * 100 : 0,
      barPercent: (totals[cat.key] / maxLiters) * 100,
      color: CATEGORY_COLORS[cat.key],
    })).filter((c) => c.liters > 0);
  }, [entriesForYear]);

  // Pure alcohol stats
  const pureAlcoholStats = useMemo(() => {
    const monthlyGrams = Array.from({ length: 12 }, () => 0);
    for (const entry of entriesForYear) {
      const month = new Date(entry.consumed_at).getMonth();
      monthlyGrams[month] += getEntryEthanolGrams(entry);
    }
    const totalGrams = monthlyGrams.reduce((a, b) => a + b, 0);
    const maxGrams = Math.max(...monthlyGrams, 1);
    return {
      totalGrams,
      monthly: monthlyGrams.map((g, i) => ({
        label: MONTH_LABELS[i],
        grams: g,
        percent: (g / maxGrams) * 100,
      })),
    };
  }, [entriesForYear]);

  const formatGrams = (g: number) => {
    if (g < 1000) return `${Math.round(g)}g`;
    return `${(g / 1000).toFixed(1)}kg`;
  };

  const yearBounds = useMemo(() => {
    const years = entries.map((e) => new Date(e.consumed_at).getFullYear());
    if (years.length === 0) return { min: currentYear, max: currentYear };
    return {
      min: Math.min(...years, currentYear),
      max: Math.max(...years, currentYear),
    };
  }, [entries, currentYear]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Stats</Text>
            <View style={styles.yearSelector}>
              <Pressable
                style={[styles.yearButton, year <= yearBounds.min && styles.yearButtonDisabled]}
                onPress={() => setYear((y) => Math.max(yearBounds.min, y - 1))}
                disabled={year <= yearBounds.min}
              >
                <Feather name="chevron-left" size={18} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.yearLabel}>{year}</Text>
              <Pressable
                style={[styles.yearButton, year >= yearBounds.max && styles.yearButtonDisabled]}
                onPress={() => setYear((y) => Math.min(yearBounds.max, y + 1))}
                disabled={year >= yearBounds.max}
              >
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Swipeable cards */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
          >
            {/* Overview Card */}
            <View style={styles.cardPage}>
              <View style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: colors.accent }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Year at a glance</Text>
                  <View style={styles.bigStat}>
                    <Text style={styles.bigStatValue}>
                      {formatVolume(overviewStats.totalLiters, settings.unit)}
                    </Text>
                    <Text style={styles.bigStatLabel}>total volume</Text>
                  </View>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{overviewStats.entryCount}</Text>
                      <Text style={styles.statLabel}>drinks logged</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{overviewStats.drinkingDays}</Text>
                      <Text style={styles.statLabel}>drinking days</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {formatVolume(overviewStats.avgPerDrinkingDay, settings.unit)}
                      </Text>
                      <Text style={styles.statLabel}>avg/drinking day</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {formatVolume(overviewStats.maxLiters, settings.unit)}
                      </Text>
                      <Text style={styles.statLabel}>peak day</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Patterns Card */}
            <View style={styles.cardPage}>
              <View style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: colors.accent }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Weekly patterns</Text>
                  <View style={styles.weekdayBars}>
                    {weekdayStats.map((day) => (
                      <View key={day.label} style={styles.weekdayBar}>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(day.percent, 2)}%`,
                                backgroundColor: colors.accent,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.weekdayLabel}>{day.label}</Text>
                        <Text style={styles.weekdayValue}>
                          {formatVolume(day.liters, settings.unit)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Drink Mix Card */}
            <View style={styles.cardPage}>
              <View style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: colors.accent }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>What you drink</Text>
                  {categoryStats.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>No data for this year</Text>
                    </View>
                  ) : (
                    <View style={styles.categoryList}>
                      {categoryStats.map((cat) => (
                        <View key={cat.key} style={styles.categoryRow}>
                          <View style={styles.categoryInfo}>
                            <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                            <Text style={styles.categoryLabel}>{cat.label}</Text>
                            <Text style={styles.categoryPercent}>{Math.round(cat.percent)}%</Text>
                          </View>
                          <View style={styles.categoryBarTrack}>
                            <View
                              style={[
                                styles.categoryBarFill,
                                { width: `${cat.barPercent}%`, backgroundColor: cat.color },
                              ]}
                            />
                          </View>
                          <Text style={styles.categoryValue}>
                            {formatVolume(cat.liters, settings.unit)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Pure Alcohol Card */}
            <View style={styles.cardPage}>
              <View style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: colors.accent }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Pure alcohol consumed</Text>
                  <View style={styles.bigStat}>
                    <Text style={styles.bigStatValue}>{formatGrams(pureAlcoholStats.totalGrams)}</Text>
                    <Text style={styles.bigStatLabel}>ethanol this year</Text>
                  </View>
                  <View style={styles.monthlyBars}>
                    {pureAlcoholStats.monthly.map((m) => (
                      <View key={m.label} style={styles.monthlyBar}>
                        <View style={styles.monthlyBarContainer}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(m.percent, 2)}%`,
                                backgroundColor: colors.accent,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.monthlyLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.footnote}>
                    Based on entry ABV when available, otherwise category defaults.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    backdropTouch: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.9,
      minHeight: SCREEN_HEIGHT * 0.7,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    yearSelector: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    yearButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    yearButtonDisabled: {
      opacity: 0.4,
    },
    yearLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      minWidth: 50,
      textAlign: "center",
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    cardsContainer: {
      paddingBottom: 16,
    },
    cardPage: {
      width: SCREEN_WIDTH,
      paddingHorizontal: 20,
    },
    card: {
      width: CARD_WIDTH,
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 0,
    },
    cardAccent: {
      height: 4,
    },
    cardContent: {
      padding: 20,
      gap: 20,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    bigStat: {
      alignItems: "center",
      gap: 4,
    },
    bigStatValue: {
      fontSize: 48,
      fontWeight: "900",
      color: colors.text,
    },
    bigStatLabel: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },
    statItem: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
    },
    weekdayBars: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
      height: 200,
    },
    weekdayBar: {
      flex: 1,
      alignItems: "center",
      gap: 8,
    },
    barContainer: {
      flex: 1,
      width: "100%",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    barFill: {
      width: "100%",
      borderRadius: 8,
    },
    weekdayLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
    },
    weekdayValue: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: "600",
    },
    categoryList: {
      gap: 14,
    },
    categoryRow: {
      gap: 8,
    },
    categoryInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    categoryLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    categoryPercent: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
    },
    categoryBarTrack: {
      height: 8,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 4,
      overflow: "hidden",
    },
    categoryBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    categoryValue: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
    },
    monthlyBars: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 4,
      height: 120,
    },
    monthlyBar: {
      flex: 1,
      alignItems: "center",
      gap: 6,
    },
    monthlyBarContainer: {
      flex: 1,
      width: "100%",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 4,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    monthlyLabel: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.textMuted,
    },
    footnote: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: "center",
    },
    emptyCard: {
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });
