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
  const { colors } = useTheme();
  const accent = colors.accent;
  const accentGlow = colors.accentSoft;
  const accentBorder = colors.accentMuted;
  const title = streak.mode === "dry" ? "Dry streak" : "Drinking streak";

  const subtitle = !hasEntries
    ? "Log your first entry to start tracking."
    : streak.days <= 0
    ? "No streak yet."
    : `Since ${formatShortDate(streak.from)}`;

  return (
    <View
      style={[
        styles.card,
        { borderColor: accentBorder, backgroundColor: colors.surface, shadowColor: colors.shadow },
      ]}
    >
      <View style={[styles.glow, { backgroundColor: accentGlow }]} />
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: accentGlow }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{title}</Text>
        </View>
        <FontAwesome6 name="fire" size={16} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>
        {streak.days <= 0 ? "--" : streak.days}{" "}
        <Text style={[styles.unit, { color: colors.textMuted }]}>days</Text>
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    gap: 8,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -30,
    right: -40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  value: {
    fontSize: 34,
    fontWeight: "900",
  },
  unit: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
});
