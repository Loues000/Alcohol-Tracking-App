import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import DrinkIcon from "../components/DrinkIcon";
import EntryForm, { EntryFormValues } from "../components/EntryForm";
import { CATEGORY_LABELS, formatSize } from "../lib/drinks";
import {
  formatShortDate,
  formatTimeInput,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { useLocalSettings } from "../lib/local-settings";
import { Entry } from "../lib/types";

type FilterKey = "all" | "today" | "week" | "month";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

export default function DataScreen() {
  const { entries, loading, refresh, deleteEntry, updateEntry, error } = useEntries();
  const { settings } = useLocalSettings();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const filteredEntries = useMemo(() => {
    if (filter === "all") return entries;
    const now = new Date();
    const start =
      filter === "today" ? startOfDay(now) : filter === "week" ? startOfWeek(now) : startOfMonth(now);
    return entries.filter((entry) => new Date(entry.consumed_at).getTime() >= start.getTime());
  }, [entries, filter]);

  const groupedEntries = useMemo(() => {
    const sorted = [...filteredEntries].sort(
      (a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
    );
    const groups = new Map<
      string,
      {
        key: string;
        date: Date;
        entries: Entry[];
        totalLiters: number;
        totalCount: number;
      }
    >();

    for (const entry of sorted) {
      const date = startOfDay(new Date(entry.consumed_at));
      const key = toDateKey(date);
      const existing = groups.get(key);
      if (existing) {
        existing.entries.push(entry);
        existing.totalLiters += entry.size_l;
        existing.totalCount += 1;
      } else {
        groups.set(key, {
          key,
          date,
          entries: [entry],
          totalLiters: entry.size_l,
          totalCount: 1,
        });
      }
    }

    const result = Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
    result.forEach((group) => {
      group.entries.sort(
        (a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
      );
    });

    return result;
  }, [filteredEntries]);

  const toggleDay = (key: string) => {
    setExpandedDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = (entry: Entry) => {
    Alert.alert("Delete entry", "This removes the entry permanently.", [
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
    const updated = await updateEntry(editingEntry.id, {
      category: values.category,
      size_l: values.size_l,
      consumed_at: values.datetime.toISOString(),
      note: values.note.trim().length > 0 ? values.note.trim() : null,
    });
    setSaving(false);

    if (!updated) {
      Alert.alert("Update failed", error ?? "Please try again.");
      return;
    }

    setEditingEntry(null);
  };

  const renderEntry = (item: Entry) => {
    const when = new Date(item.consumed_at);
    return (
      <View key={item.id} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryTitleRow}>
            <DrinkIcon category={item.category} size={16} color="#2b2724" />
            <Text style={styles.entryTitle}>{CATEGORY_LABELS[item.category]}</Text>
          </View>
          <Text style={styles.entrySize}>{formatSize(item.size_l, settings.unit)}</Text>
        </View>
        <Text style={styles.entryMeta}>{formatTimeInput(when)}</Text>
        {item.note ? <Text style={styles.entryNote}>{item.note}</Text> : null}
        <View style={styles.entryActions}>
          <Pressable style={styles.actionButton} onPress={() => setEditingEntry(item)}>
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item)}>
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderDayGroup = ({
    item,
  }: {
    item: {
      key: string;
      date: Date;
      entries: Entry[];
      totalLiters: number;
      totalCount: number;
    };
  }) => {
    const expanded = expandedDays[item.key] ?? false;
    return (
      <View style={styles.dayCard}>
        <Pressable style={styles.dayHeader} onPress={() => toggleDay(item.key)}>
          <View>
            <Text style={styles.dayTitle}>{formatShortDate(item.date)}</Text>
            <Text style={styles.daySummary}>
              {item.totalCount} drinks - {formatSize(item.totalLiters, settings.unit)}
            </Text>
          </View>
          <Text style={styles.dayToggle}>{expanded ? "Hide" : "Show"}</Text>
        </Pressable>
        {expanded ? <View style={styles.dayEntries}>{item.entries.map(renderEntry)}</View> : null}
      </View>
    );
  };

  const editInitialValues = useMemo(() => {
    if (!editingEntry) return undefined;
    return {
      category: editingEntry.category,
      size_l: editingEntry.size_l,
      datetime: new Date(editingEntry.consumed_at),
      note: editingEntry.note ?? "",
    };
  }, [editingEntry]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={groupedEntries}
        keyExtractor={(item) => item.key}
        renderItem={renderDayGroup}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>History</Text>
            <View style={styles.filterRow}>
              {FILTERS.map((item) => {
                const selected = item.key === filter;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {editingEntry ? (
              <View style={styles.editCard}>
                <Text style={styles.editTitle}>Edit entry</Text>
                <EntryForm
                  initialValues={editInitialValues}
                  onSubmit={handleUpdate}
                  submitLabel="Save changes"
                  onCancel={() => setEditingEntry(null)}
                  unit={settings.unit}
                  busy={saving}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>Log your first drink to see history.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4ef",
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d6d1cc",
    backgroundColor: "#f6f4f1",
  },
  filterChipSelected: {
    backgroundColor: "#2b2b2b",
    borderColor: "#2b2b2b",
  },
  filterText: {
    fontSize: 13,
    color: "#2b2b2b",
  },
  filterTextSelected: {
    color: "#f8f5f1",
  },
  editCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece6e1",
    gap: 12,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2b2724",
  },
  dayCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece6e1",
    gap: 12,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  daySummary: {
    color: "#6a645d",
    fontSize: 12,
    marginTop: 4,
  },
  dayToggle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b3530",
  },
  dayEntries: {
    gap: 10,
  },
  entryCard: {
    backgroundColor: "#f6f4f1",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  entrySize: {
    color: "#6a645d",
    fontSize: 13,
  },
  entryMeta: {
    color: "#6a645d",
    fontSize: 12,
  },
  entryNote: {
    color: "#3f3a35",
  },
  entryActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ece7e2",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b3530",
  },
  deleteButton: {
    backgroundColor: "#f0dede",
  },
  deleteText: {
    color: "#8f3a3a",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1c1a",
  },
  emptySubtitle: {
    color: "#6a645d",
  },
});
