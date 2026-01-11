import { StyleSheet, Text, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import DrinkIcon from "../DrinkIcon";
import { DRINK_CATEGORIES } from "../../lib/drinks";
import { formatDrinkCount, formatVolume } from "../../lib/dashboard-utils";
import { CATEGORY_COLORS } from "../../lib/dashboard-theme";
import { useTheme } from "../../lib/theme-context";
import { VolumeUnit } from "../../lib/types";

type Props = {
  categoryCounts: Record<string, number>;
  categoryVolumes: Record<string, number>;
  unit: VolumeUnit;
};

export function CategoryChart({ categoryCounts, categoryVolumes, unit }: Props) {
  const { colors } = useTheme();
  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={styles.header}>
          <FontAwesome6 name="chart-pie" size={14} color={colors.text} />
          <Text style={[styles.title, { color: colors.text }]}>Category summary (this month)</Text>
        </View>
        <View style={[styles.emptyState, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No data for this period.</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Add entries to see a category breakdown.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border, shadowColor: colors.shadow },
      ]}
    >
      <View style={styles.header}>
        <FontAwesome6 name="chart-pie" size={14} color={colors.text} />
        <Text style={[styles.title, { color: colors.text }]}>Category summary (this month)</Text>
      </View>

      {DRINK_CATEGORIES.map((category) => {
        const count = categoryCounts[category.key] ?? 0;
        const percent = total === 0 ? 0 : Math.round((count / total) * 100);
        const volume = formatVolume(categoryVolumes[category.key] ?? 0, unit);
        const color = CATEGORY_COLORS[category.key] ?? colors.text;

        return (
          <View key={category.key} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.labelRow}>
                <DrinkIcon category={category.key} size={14} color={color} />
                <Text style={[styles.label, { color: colors.text }]}>{category.label}</Text>
              </View>
              <Text style={[styles.value, { color: colors.textMuted }]}>
                {formatDrinkCount(count)} - {percent}% - {volume}
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "600" },
  emptyState: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 13, fontWeight: "700" },
  emptySubtitle: { fontSize: 12, marginTop: 4 },
  row: { gap: 6 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 13, fontWeight: "600" },
  value: { fontSize: 12 },
  barTrack: {
    height: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 8 },
});
