import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DrinkIcon from "../components/DrinkIcon";
import { CategoryChart } from "../components/dashboard/CategoryChart";
import { StreakCard } from "../components/dashboard/StreakCard";
import { SummaryCard } from "../components/dashboard/SummaryCard";
import { YearlyHeatmap } from "../components/dashboard/YearlyHeatmap";
import { DRINK_CATEGORIES } from "../lib/drinks";
import { startOfDay, startOfMonth, startOfWeek, toDateKey } from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { useLocalSettings } from "../lib/local-settings";
import { useProfile } from "../lib/profile-context";
import { groupEntriesByCategory } from "../lib/stats";
import { calculateStreak, formatDrinkCount, formatVolume, getGreeting } from "../lib/dashboard-utils";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";
import { Entry } from "../lib/types";

export default function DashboardScreen() {
  const { entries } = useEntries();
  const { profile } = useProfile();
  const { settings } = useLocalSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        setNow(new Date());
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    const intervalId = setInterval(() => setNow(new Date()), 60000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const todayStart = useMemo(() => startOfDay(now), [now]);
  const weekStart = useMemo(() => startOfWeek(now), [now]);
  const monthStart = useMemo(() => startOfMonth(now), [now]);

  const {
    todayEntries,
    weekEntries,
    monthEntries,
    todayVolumeL,
    weekVolumeL,
    monthVolumeL,
    countsByDate,
    volumeByDate,
  } = useMemo(() => {
    const todayEntries: Entry[] = [];
    const weekEntries: Entry[] = [];
    const monthEntries: Entry[] = [];
    const countsByDate: Record<string, number> = {};
    const volumeByDate: Record<string, { count: number; volume_l: number }> = {};
    let todayVolumeL = 0;
    let weekVolumeL = 0;
    let monthVolumeL = 0;

    const todayStartTime = todayStart.getTime();
    const weekStartTime = weekStart.getTime();
    const monthStartTime = monthStart.getTime();

    for (const entry of entries) {
      const consumedAt = new Date(entry.consumed_at);
      const time = consumedAt.getTime();

      if (time >= todayStartTime) {
        todayEntries.push(entry);
        todayVolumeL += entry.size_l;
      }
      if (time >= weekStartTime) {
        weekEntries.push(entry);
        weekVolumeL += entry.size_l;
      }
      if (time >= monthStartTime) {
        monthEntries.push(entry);
        monthVolumeL += entry.size_l;
      }

      const key = toDateKey(startOfDay(consumedAt));
      countsByDate[key] = (countsByDate[key] ?? 0) + 1;
      const bucket = volumeByDate[key];
      if (bucket) {
        bucket.count += 1;
        bucket.volume_l += entry.size_l;
      } else {
        volumeByDate[key] = { count: 1, volume_l: entry.size_l };
      }
    }

    return {
      todayEntries,
      weekEntries,
      monthEntries,
      todayVolumeL,
      weekVolumeL,
      monthVolumeL,
      countsByDate,
      volumeByDate,
    };
  }, [entries, todayStart, weekStart, monthStart]);

  const categoryCounts = useMemo(
    () => groupEntriesByCategory(monthEntries),
    [monthEntries]
  );
  const categoryVolumes = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const category of DRINK_CATEGORIES) totals[category.key] = 0;
    for (const entry of monthEntries) totals[entry.category] += entry.size_l;
    return totals;
  }, [monthEntries]);

  const streak = useMemo(
    () => calculateStreak(entries, countsByDate, todayStart),
    [entries, countsByDate, todayStart]
  );

  const displayName = (profile?.display_name ?? "").trim() || "there";
  const greeting = getGreeting(now.getHours());
  const unit = settings.unit;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.decorOrb} />
        <View style={styles.decorOrbSmall} />
        <View style={styles.decorStripe} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerText}>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>Dashboard</Text>
              </View>
              <Text style={styles.greeting}>
                {greeting}, {displayName}
              </Text>
              <Text style={styles.subtitle}>
                Here's your quick snapshot.
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <DrinkIcon category="longdrink" size={18} color={colors.accent} />
            </View>
          </View>
        </View>

        <StreakCard streak={streak} hasEntries={entries.length > 0} />

        <View style={styles.summaryRow}>
          <SummaryCard
            variant="today"
            drinkCount={formatDrinkCount(todayEntries.length)}
            volume={formatVolume(todayVolumeL, unit)}
          />
          <SummaryCard
            variant="week"
            drinkCount={formatDrinkCount(weekEntries.length)}
            volume={formatVolume(weekVolumeL, unit)}
          />
          <SummaryCard
            variant="month"
            drinkCount={formatDrinkCount(monthEntries.length)}
            volume={formatVolume(monthVolumeL, unit)}
          />
        </View>

        <YearlyHeatmap
          countsByDate={countsByDate}
          volumeByDate={volumeByDate}
          now={now}
          unit={unit}
        />

        <CategoryChart
          categoryCounts={categoryCounts}
          categoryVolumes={categoryVolumes}
          unit={unit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    container: {
      padding: 20,
      gap: 18,
    },
    decorOrb: {
      position: "absolute",
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: colors.accentSoft,
      top: -120,
      right: -80,
    },
    decorOrbSmall: {
      position: "absolute",
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.surfaceMuted,
      top: 120,
      left: -60,
    },
    decorStripe: {
      position: "absolute",
      height: 120,
      width: 320,
      borderRadius: 80,
      backgroundColor: colors.accentMuted,
      top: 40,
      left: 40,
      transform: [{ rotate: "-8deg" }],
    },
    header: { gap: 10 },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    headerText: { flexShrink: 1, minWidth: 0, gap: 4 },
    headerBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    headerIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    greeting: { fontSize: 26, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  });
