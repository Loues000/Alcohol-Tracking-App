import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";

type Variant = "today" | "week" | "month";

type Props = {
  variant: Variant;
  drinkCount: string;
  volume: string;
};

const CONFIG: Record<Variant, { label: string; icon: "sun" | "calendar" | "calendar-days" }> = {
  today: { label: "Today", icon: "sun" },
  week: { label: "This week", icon: "calendar" },
  month: { label: "This month", icon: "calendar-days" },
};

export function SummaryCard({ variant, drinkCount, volume }: Props) {
  const { colors } = useTheme();
  const { label, icon } = CONFIG[variant];
  const tint =
    variant === "today"
      ? colors.accentSoft
      : variant === "week"
      ? colors.accentMuted
      : colors.surfaceMuted;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.icon,
            { backgroundColor: tint, borderColor: colors.borderStrong } as ViewStyle,
          ]}
        >
          <FontAwesome6 name={icon} size={12} color={colors.accent} />
        </View>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{drinkCount}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>{volume}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 0,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  value: { fontSize: 18, fontWeight: "900" },
  meta: { fontSize: 11, fontWeight: "600" },
});
