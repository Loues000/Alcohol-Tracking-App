import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DrinkIcon from "./DrinkIcon";
import { DRINK_CATEGORIES, formatSize } from "../lib/drinks";
import { DrinkCategory, VolumeUnit } from "../lib/types";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type PendingEntry = {
  id: string;
  category: DrinkCategory;
  size_l: number;
  count: number;
  custom_name?: string | null;
  abv_percent?: number | null;
};

type PendingEntriesCardProps = {
  entries: PendingEntry[];
  unit: VolumeUnit;
  onRemove: (id: string) => void;
};

const formatPendingLabel = (entry: PendingEntry, unit: VolumeUnit) => {
  const baseLabel =
    DRINK_CATEGORIES.find((item) => item.key === entry.category)?.label ?? entry.category;
  const details =
    [
      entry.category === "other" ? entry.custom_name ?? null : null,
      entry.abv_percent !== null && entry.abv_percent !== undefined ? `${entry.abv_percent}% ABV` : null,
    ]
      .filter(Boolean)
      .join(" - ") || null;
  const label = details ? `${baseLabel} - ${details}` : baseLabel;
  return `${label} - ${formatSize(entry.size_l, unit)} - x${entry.count}`;
};

export default function PendingEntriesCard({ entries, unit, onRemove }: PendingEntriesCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Pending entries</Text>
      <View style={styles.list}>
        {entries.map((entry) => (
          <View key={entry.id} style={styles.item}>
            <View style={styles.info}>
              <DrinkIcon category={entry.category} size={14} color={colors.text} />
              <Text style={styles.text}>{formatPendingLabel(entry, unit)}</Text>
            </View>
            <Pressable onPress={() => onRemove(entry.id)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    list: {
      marginTop: 6,
      gap: 6,
    },
    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
    },
    info: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    text: {
      fontSize: 12,
      color: colors.text,
      flexShrink: 1,
    },
    remove: {
      fontSize: 12,
      color: "#8f3a3a",
      fontWeight: "600",
    },
  });
