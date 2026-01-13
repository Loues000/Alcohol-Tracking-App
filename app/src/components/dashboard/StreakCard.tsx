import { StyleSheet, Text, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { formatShortDate } from "../../lib/dates";
import { useTheme } from "../../lib/theme-context";

type Streak = {
  mode: "dry" | "drinking";
  days: number;
  from: Date;
};

type Props = {
  streak: Streak;
  hasEntries: boolean;
};

export function StreakCard({ streak, hasEntries }: Props) {
  const { colors, mode } = useTheme();
  const accent = colors.accent;
  const accentGlow = colors.accentSoft;
  const accentBorder = colors.accentMuted;
  const title = streak.mode === "dry" ? "Dry streak" : "Drinking streak";
  const hasStreak = streak.days > 0;

  const subtitle = !hasEntries
    ? "Log your first entry to start tracking."
    : streak.days <= 0
    ? "No streak yet."
    : `Since ${formatShortDate(streak.from)}`;

  // Ember glow intensity based on streak
  const emberOpacity = hasStreak ? (mode === "dark" ? 0.25 : 0.12) : 0.05;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: accentBorder,
          backgroundColor: colors.surface,
          shadowColor: accent,
          shadowOpacity: emberOpacity,
        },
      ]}
    >
      {/* Multiple glow layers for ember effect */}
      <View style={[styles.glowOuter, { backgroundColor: accentGlow }]} />
      <View style={[styles.glowInner, { backgroundColor: accentGlow }]} />
      
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: accentGlow }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{title}</Text>
        </View>
        <View style={[styles.fireContainer, { backgroundColor: colors.surfaceMuted }]}>
          <FontAwesome6 name="fire" size={18} color={accent} />
        </View>
      </View>
      
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.text }]}>
          {streak.days <= 0 ? "--" : streak.days}
        </Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>days</Text>
      </View>
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    gap: 10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  glowOuter: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -60,
    right: -60,
    opacity: 0.5,
  },
  glowInner: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -20,
    right: -20,
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  fireContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  value: {
    fontSize: 42,
    fontWeight: "900",
  },
  unit: {
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
});
