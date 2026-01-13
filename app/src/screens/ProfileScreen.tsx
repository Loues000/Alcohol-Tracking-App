import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { CATEGORY_LABELS } from "../lib/drinks";
import { toLocalDayKeyFromISO } from "../lib/dates";
import { formatDrinkCount } from "../lib/dashboard-utils";
import { useProfile } from "../lib/profile-context";
import { useEntries } from "../lib/entries-context";
import { supabase } from "../lib/supabase";
import type { Theme } from "../lib/theme";
import { useTheme } from "../lib/theme-context";
import type { RootStackParamList } from "../navigation/RootNavigator";

const MS_PER_DAY = 86_400_000;

const toDayNumber = (date: Date) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);

const parseDayKey = (dayKey: string) => {
  const [year, month, day] = dayKey.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatDayKey = (dayKey: string) => {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return dayKey;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export default function ProfileScreen() {
  const { profile, updateProfile, error } = useProfile();
  const { entries } = useEntries();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
  }, [profile]);

  const handleSaveName = async () => {
    setSaving(true);
    const updated = await updateProfile({
      display_name: displayName.trim().length > 0 ? displayName.trim() : "",
    });
    setSaving(false);
    setEditingName(false);
    if (!updated) {
      Alert.alert("Save failed", error ?? "Please try again.");
    }
  };

  const stats = useMemo(() => {
    const totalDrinks = entries.length;
    if (entries.length === 0) {
      return {
        totalDrinks,
        daysTracked: 0,
        drinkingDays: 0,
        dryDays: 0,
        heaviestDay: null as null | { dayKey: string; count: number },
        favoriteDrink: null as null | { name: string; count: number },
      };
    }

    const uniqueDays = new Set<string>();
    const countsByDay: Record<string, number> = {};
    const favoriteCounts: Record<string, { count: number; lastConsumedAt: number }> = {};
    let earliestDayNumber = Infinity;

    for (const entry of entries) {
      const consumedAt = new Date(entry.consumed_at);
      const consumedAtTime = consumedAt.getTime();
      if (Number.isNaN(consumedAtTime)) continue;

      const dayKey = toLocalDayKeyFromISO(entry.consumed_at);
      uniqueDays.add(dayKey);
      countsByDay[dayKey] = (countsByDay[dayKey] ?? 0) + 1;
      earliestDayNumber = Math.min(earliestDayNumber, toDayNumber(consumedAt));

      const favoriteKey =
        entry.category === "other" && (entry.custom_name ?? "").trim().length > 0
          ? (entry.custom_name ?? "").trim()
          : CATEGORY_LABELS[entry.category];

      const existing = favoriteCounts[favoriteKey];
      if (existing) {
        existing.count += 1;
        existing.lastConsumedAt = Math.max(existing.lastConsumedAt, consumedAtTime);
      } else {
        favoriteCounts[favoriteKey] = { count: 1, lastConsumedAt: consumedAtTime };
      }
    }

    const todayDayNumber = toDayNumber(new Date());
    const daysTracked =
      earliestDayNumber === Infinity ? 0 : Math.max(0, todayDayNumber - earliestDayNumber + 1);
    const drinkingDays = uniqueDays.size;
    const dryDays = Math.max(0, daysTracked - drinkingDays);

    let heaviestDay: { dayKey: string; count: number } | null = null;
    for (const [dayKey, count] of Object.entries(countsByDay)) {
      if (!heaviestDay) {
        heaviestDay = { dayKey, count };
        continue;
      }

      const currentDayNumber = toDayNumber(parseDayKey(dayKey) ?? new Date(0));
      const bestDayNumber = toDayNumber(parseDayKey(heaviestDay.dayKey) ?? new Date(0));
      const isBetter = count > heaviestDay.count || (count === heaviestDay.count && currentDayNumber > bestDayNumber);

      if (isBetter) {
        heaviestDay = { dayKey, count };
      }
    }

    let favoriteName: string | null = null;
    let favoriteCount = 0;
    let favoriteLastConsumedAt = -Infinity;

    for (const [name, info] of Object.entries(favoriteCounts)) {
      if (info.count > favoriteCount || (info.count === favoriteCount && info.lastConsumedAt > favoriteLastConsumedAt)) {
        favoriteName = name;
        favoriteCount = info.count;
        favoriteLastConsumedAt = info.lastConsumedAt;
      }
    }

    const favoriteDrink = favoriteName ? { name: favoriteName, count: favoriteCount } : null;

    return { totalDrinks, daysTracked, drinkingDays, dryDays, heaviestDay, favoriteDrink };
  }, [entries]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Feather name="user" size={32} color={colors.textMuted} />
          </View>
          <View style={styles.headerInfo}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Display name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.nameInput}
                  autoFocus
                />
                <Pressable
                  style={styles.nameButton}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  <Feather name="check" size={18} color={colors.accent} />
                </Pressable>
                <Pressable
                  style={styles.nameButton}
                  onPress={() => {
                    setDisplayName(profile?.display_name ?? "");
                    setEditingName(false);
                  }}
                >
                  <Feather name="x" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.nameRow} onPress={() => setEditingName(true)}>
                <Text style={styles.displayName}>
                  {displayName || "Add display name"}
                </Text>
                <Feather name="edit-2" size={14} color={colors.textMuted} />
              </Pressable>
            )}
            <Text style={styles.email}>{email ?? "Loading..."}</Text>
          </View>
          <Pressable
            style={styles.headerButton}
            onPress={() => navigation.navigate("ProfileSettings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Feather name="settings" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All-time stats</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="hash" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Total drinks</Text>
            </View>
            <Text style={styles.statValueText}>{stats.totalDrinks}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="calendar" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Days tracked</Text>
            </View>
            <View style={styles.statValueStack}>
              <Text style={styles.statValueText}>{stats.daysTracked}</Text>
              {stats.daysTracked > 0 && (
                <Text style={styles.statSubValueText}>
                  {stats.drinkingDays} drinking • {stats.dryDays} dry
                </Text>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="trending-up" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Heaviest day</Text>
            </View>
            <View style={styles.statValueStack}>
              <Text style={styles.statValueText}>
                {stats.heaviestDay ? formatDayKey(stats.heaviestDay.dayKey) : "—"}
              </Text>
              {stats.heaviestDay && (
                <Text style={styles.statSubValueText}>
                  {formatDrinkCount(stats.heaviestDay.count)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="star" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Favorite drink</Text>
            </View>
            <View style={styles.statValueStack}>
              <Text style={styles.statValueText}>
                {stats.favoriteDrink ? stats.favoriteDrink.name : "—"}
              </Text>
              {stats.favoriteDrink && (
                <Text style={styles.statSubValueText}>
                  {formatDrinkCount(stats.favoriteDrink.count)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
      gap: 24,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingBottom: 8,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.border,
    },
    headerInfo: {
      flex: 1,
      gap: 4,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nameEditRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    displayName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    nameInput: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nameButton: {
      padding: 8,
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
    },
    email: {
      fontSize: 14,
      color: colors.textMuted,
    },
    section: {
      gap: 2,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowLabel: {
      fontSize: 16,
      color: colors.text,
    },
    deleteLabel: {
      color: "#8f3a3a",
    },
    statValueStack: {
      alignItems: "flex-end",
      gap: 2,
      paddingLeft: 12,
    },
    statValueText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    statSubValueText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
    colorDots: {
      flexDirection: "row",
      gap: 10,
    },
    colorDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "transparent",
    },
    colorDotSelected: {
      borderWidth: 3,
    },
    unitChips: {
      flexDirection: "row",
      gap: 6,
    },
    unitChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitChipSelected: {
      borderColor: "transparent",
    },
    unitChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    unitChipTextSelected: {},
    footnote: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
    },
  });
