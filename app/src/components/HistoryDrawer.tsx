import { useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DrinkIcon from "./DrinkIcon";
import EntryForm, { EntryFormValues } from "./EntryForm";
import { CATEGORY_LABELS, formatSize } from "../lib/drinks";
import {
  formatShortDate,
  formatTimeInput,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { useLocalSettings } from "../lib/local-settings";
import { Entry } from "../lib/types";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type FilterKey = "all" | "today" | "week" | "month";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HistoryDrawer({ visible, onClose }: Props) {
  const { entries, deleteEntry, updateEntry, error } = useEntries();
  const { settings } = useLocalSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState<FilterKey>("today");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    let start: Date;
    switch (filter) {
      case "today":
        start = startOfDay(now);
        break;
      case "week":
        start = startOfWeek(now);
        break;
      case "month":
        start = startOfMonth(now);
        break;
      default:
        return [...entries].sort(
          (a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
        );
    }
    return entries
      .filter((entry) => new Date(entry.consumed_at).getTime() >= start.getTime())
      .sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime());
  }, [entries, filter]);

  const handleDelete = (entry: Entry) => {
    Alert.alert("Delete entry", "Remove this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const ok = await deleteEntry(entry.id);
          if (!ok) {
            Alert.alert("Delete failed", error ?? "Please try again.");
          }
        },
      },
    ]);
  };

  const handleUpdate = async (values: EntryFormValues) => {
    if (!editingEntry) return;
    setSaving(true);
    const customName =
      values.category === "other" && values.custom_name
        ? values.custom_name.trim()
        : null;
    try {
      const updated = await updateEntry(editingEntry.id, {
        category: values.category,
        size_l: values.size_l,
        consumed_at: values.datetime.toISOString(),
        note: values.note.trim().length > 0 ? values.note.trim() : null,
        custom_name: customName && customName.length > 0 ? customName : null,
        abv_percent: values.abv_percent ?? null,
      });

      if (!updated) {
        Alert.alert("Update failed", error ?? "Please try again.");
        return;
      }

      setEditingEntry(null);
    } finally {
      setSaving(false);
    }
  };

  const editInitialValues = useMemo(() => {
    if (!editingEntry) return undefined;
    return {
      category: editingEntry.category,
      size_l: editingEntry.size_l,
      datetime: new Date(editingEntry.consumed_at),
      note: editingEntry.note ?? "",
      custom_name: editingEntry.custom_name ?? null,
      abv_percent: editingEntry.abv_percent ?? null,
    };
  }, [editingEntry]);

  const renderEntry = ({ item }: { item: Entry }) => {
    const when = new Date(item.consumed_at);
    const isToday = startOfDay(when).getTime() === startOfDay(new Date()).getTime();
    const dateLabel = isToday ? "Today" : formatShortDate(when);

    return (
      <View style={styles.entryRow}>
        <View style={styles.entryIcon}>
          <DrinkIcon category={item.category} size={16} color={colors.text} />
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryCategory}>
            {item.category === "other" && item.custom_name
              ? item.custom_name
              : CATEGORY_LABELS[item.category]}
          </Text>
          <Text style={styles.entryMeta}>
            {formatSize(item.size_l, settings.unit)} · {dateLabel} {formatTimeInput(when)}
          </Text>
        </View>
        <View style={styles.entryActions}>
          <Pressable style={styles.entryAction} onPress={() => setEditingEntry(item)}>
            <Feather name="edit-2" size={14} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.entryAction} onPress={() => handleDelete(item)}>
            <Feather name="trash-2" size={14} color="#8f3a3a" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>History</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.filters}>
            {FILTERS.map((item) => {
              const selected = item.key === filter;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                >
                  <Text
                    style={[styles.filterText, selected && styles.filterTextSelected]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {editingEntry ? (
            <View style={styles.editSection}>
              <Text style={styles.editTitle}>Edit entry</Text>
              <EntryForm
                initialValues={editInitialValues}
                onSubmit={handleUpdate}
                submitLabel="Save"
                onCancel={() => setEditingEntry(null)}
                unit={settings.unit}
                busy={saving}
              />
            </View>
          ) : (
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.id}
              renderItem={renderEntry}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="inbox" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No entries</Text>
                  <Text style={styles.emptySubtitle}>
                    {filter === "all"
                      ? "Start logging to see your history."
                      : "No entries for this period."}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    backdropTouch: {
      flex: 1,
    },
    drawer: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.85,
      minHeight: SCREEN_HEIGHT * 0.5,
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
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    filters: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    filterTextSelected: {
      color: colors.accentText,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 2,
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    entryIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    entryInfo: {
      flex: 1,
      gap: 2,
    },
    entryCategory: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    entryMeta: {
      fontSize: 12,
      color: colors.textMuted,
    },
    entryActions: {
      flexDirection: "row",
      gap: 8,
    },
    entryAction: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    editSection: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 12,
    },
    editTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 60,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
