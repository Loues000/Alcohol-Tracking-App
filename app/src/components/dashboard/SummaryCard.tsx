import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";
import { hexToRgba } from "../../lib/theme";

type Variant = "today" | "week" | "month";

type Props = {
  variant: Variant;
  drinkCount: string;
  volume: string;
};

const VARIANT_CONFIG: Record<
  Variant,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  today: { label: "Today", icon: "sunny-outline" },
  week: { label: "This week", icon: "calendar-outline" },
  month: { label: "This month", icon: "calendar-number-outline" },
};

export function SummaryCard({ variant, drinkCount, volume }: Props) {
  const { colors, mode } = useTheme();
  const { label, icon } = VARIANT_CONFIG[variant];

  // Coaster ring effect color
  const coasterColor = hexToRgba(colors.accent, mode === "dark" ? 0.2 : 0.15);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          shadowColor: colors.accent,
        },
      ]}
    >
      {/* Coaster ring effect */}
      <View
        style={[
          styles.coasterRing,
          {
            borderColor: coasterColor,
          },
        ]}
      />
      <View style={[styles.glow, { backgroundColor: colors.accentSoft }]} />
      
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>{label}</Text>
        </View>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name={icon} size={14} color={colors.accent} />
        </View>
      </View>

      <Text style={[styles.value, { color: colors.text }]}>{drinkCount}</Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{volume}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    gap: 6,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  coasterRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    bottom: -30,
    left: -30,
    opacity: 0.6,
  },
  glow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -30,
    right: -30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
});

