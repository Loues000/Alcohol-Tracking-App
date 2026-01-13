import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import DrinkIcon from "../components/DrinkIcon";
import { CategoryChart } from "../components/dashboard/CategoryChart";
import { StreakCard } from "../components/dashboard/StreakCard";
import { SummaryCard } from "../components/dashboard/SummaryCard";
import { YearlyHeatmap } from "../components/dashboard/YearlyHeatmap";
import HistoryDrawer from "../components/HistoryDrawer";
import StatsSheet from "../components/StatsSheet";
import { DRINK_CATEGORIES } from "../lib/drinks";
import { startOfDay, startOfMonth, startOfWeek, toLocalDayKeyFromISO } from "../lib/dates";
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
  const [historyVisible, setHistoryVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

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

      const key = toLocalDayKeyFromISO(entry.consumed_at);
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
              <Text style={styles.greeting}>
                {greeting}, {displayName}
              </Text>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                style={styles.headerButton}
                onPress={() => setHistoryVisible(true)}
              >
                <Feather name="clock" size={18} color={colors.text} />
                {todayEntries.length > 0 && (
                  <View style={styles.headerBadgeCount}>
                    <Text style={styles.headerBadgeCountText}>
                      {todayEntries.length > 9 ? "9+" : todayEntries.length}
                    </Text>
                  </View>
                )}
              </Pressable>
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

        <View style={styles.fabSpacer} />
      </ScrollView>

      {/* Stats FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => setStatsVisible(true)}
      >
        <FontAwesome6 name="chart-simple" size={20} color={colors.accentText} />
      </Pressable>

      {/* History Drawer */}
      <HistoryDrawer
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />

      {/* Stats Sheet */}
      <StatsSheet
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
      />
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
    headerButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    headerBadgeCount: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    headerBadgeCountText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.accentText,
    },
    greeting: { fontSize: 26, fontWeight: "800", color: colors.text },
    summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    fabSpacer: {
      height: 70,
    },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  });
