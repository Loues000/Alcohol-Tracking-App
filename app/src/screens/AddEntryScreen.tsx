import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import DrinkIcon from "../components/DrinkIcon";
import DayWheel from "../components/DayWheel";
import ErrorBanner from "../components/ErrorBanner";
import MonthYearPickerModal from "../components/MonthYearPickerModal";
import NoteModal from "../components/NoteModal";
import PendingEntriesCard from "../components/PendingEntriesCard";
import SizePickerModal from "../components/SizePickerModal";
import TimePickerModal from "../components/TimePickerModal";
import { DEFAULT_ABV, DRINK_CATEGORIES, SIZE_OPTIONS, formatSize } from "../lib/drinks";
import { addDays, formatDateInput, pad2, startOfDay } from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { useLocalSettings } from "../lib/local-settings";
import { DrinkCategory } from "../lib/types";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type PendingEntry = {
  id: string;
  category: DrinkCategory;
  size_l: number;
  count: number;
  custom_name?: string | null;
  abv_percent?: number | null;
  note?: string | null;
};

export default function AddEntryScreen() {
  const { createEntries, error } = useEntries();
  const { settings, loading: settingsLoading, updateSettings } = useLocalSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(startOfDay(now));
  const [displayMonthDate, setDisplayMonthDate] = useState(startOfDay(now));
  const [category, setCategory] = useState<DrinkCategory>("beer");
  const [sizeL, setSizeL] = useState(SIZE_OPTIONS.beer[0]);
  const [count, setCount] = useState("1");
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(Math.floor(now.getMinutes() / 5) * 5);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [note, setNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [customName, setCustomName] = useState("");
  const [abvInput, setAbvInput] = useState("");
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const yearRangeStart = now.getFullYear() - 25;
  const years = useMemo(
    () => Array.from({ length: 51 }, (_, index) => yearRangeStart + index),
    [yearRangeStart]
  );
  const busy = saving || settingsLoading;

  useEffect(() => {
    if (!SIZE_OPTIONS[category].includes(sizeL)) {
      setSizeL(SIZE_OPTIONS[category][0]);
    }
  }, [category, sizeL]);

  useEffect(() => {
    if (category !== "other") {
      setAbvInput("");
    }
  }, [category]);

  useEffect(() => {
    setDisplayMonthDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (settingsLoading || defaultsApplied) return;
    setCategory(settings.defaultCategory);
    setSizeL(settings.defaultSizeL);
    setDefaultsApplied(true);
  }, [settingsLoading, defaultsApplied, settings]);

  const parsedCount = useMemo(() => {
    const value = parseInt(count, 10);
    if (!Number.isFinite(value) || value <= 0) return 1;
    return Math.min(value, 50);
  }, [count]);

  const validateEntryFields = () => {
    if (category === "other") {
      const trimmedAbv = abvInput.trim();
      const normalizedAbv = trimmedAbv.replace(",", ".");
      const parsedAbv = trimmedAbv.length === 0 ? DEFAULT_ABV.other ?? 10 : Number(normalizedAbv);
      const trimmedName = customName.trim();
      if (!trimmedName) {
        Alert.alert("Missing name", "Please add a name for Other.");
        return null;
      }
      if (!Number.isFinite(parsedAbv) || parsedAbv <= 0 || parsedAbv > 100) {
        Alert.alert("Check ABV", "Enter a number between 0 and 100.");
        return null;
      }
      return { custom_name: trimmedName, abv_percent: parsedAbv };
    }

    const defaultAbv = DEFAULT_ABV[category] ?? null;
    return { custom_name: null, abv_percent: defaultAbv };
  };

  const handleSave = async () => {
    const entryFields = validateEntryFields();
    if (!entryFields) return;

    setSaving(true);
    try {
      const consumedAt = new Date(selectedDate);
      consumedAt.setHours(hour, minute, 0, 0);

      const trimmedNote = note.trim();
      const noteValue = trimmedNote.length > 0 ? trimmedNote : null;
      const entriesToSave: PendingEntry[] = [
        ...pendingEntries,
        {
          id: "current",
          category,
          size_l: sizeL,
          count: parsedCount,
          ...entryFields,
          note: noteValue,
        },
      ];
      const inputs = entriesToSave.flatMap((entry) =>
        Array.from({ length: entry.count }, () => ({
          consumed_at: consumedAt.toISOString(),
          category: entry.category,
          size_l: entry.size_l,
          note: entry.note ?? null,
          custom_name: entry.category === "other" ? entry.custom_name ?? null : null,
          abv_percent: entry.abv_percent ?? null,
        }))
      );

      const created = await createEntries(inputs);
      if (created.length === 0) {
        Alert.alert("Entry not saved", error ?? "Please try again.");
        return;
      }

      void updateSettings({
        defaultCategory: category,
        defaultSizeL: sizeL,
      });
      setSaved(true);
      setPendingEntries([]);
      setCount("1");
      setNote("");
      setNoteDraft("");
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const openNoteModal = () => {
    setNoteDraft(note);
    setNoteModalVisible(true);
  };

  const closeNoteModal = () => {
    setNote(noteDraft.trim());
    setNoteModalVisible(false);
  };

  const clearNote = () => {
    setNote("");
    setNoteDraft("");
    setNoteModalVisible(false);
  };

  const handleNextEntry = () => {
    const entryFields = validateEntryFields();
    if (!entryFields) return;

    const trimmedNote = note.trim();
    const noteValue = trimmedNote.length > 0 ? trimmedNote : null;

    const entry: PendingEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      category,
      size_l: sizeL,
      count: parsedCount,
      ...entryFields,
      note: noteValue,
    };
    setPendingEntries((prev) => [...prev, entry]);

    void updateSettings({ defaultCategory: category, defaultSizeL: sizeL });
    const fallbackCategory = settings.defaultCategory ?? "beer";
    const fallbackSize = settings.defaultSizeL ?? SIZE_OPTIONS[fallbackCategory][0];
    setCategory(fallbackCategory);
    setSizeL(fallbackSize);
    setCount("1");
    setCustomName("");
    setAbvInput("");
  };

  const handleRemovePending = (id: string) => {
    setPendingEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const dateLabel = formatDateInput(selectedDate);
  const totalEntries = pendingEntries.reduce((sum, entry) => sum + entry.count, 0) + parsedCount;

  const applyMonthYear = (month: number, year: number) => {
    setSelectedDate((prev) => {
      const day = prev.getDate();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const nextDay = Math.min(day, daysInMonth);
      return startOfDay(new Date(year, month, nextDay));
    });
  };

  const handleVisibleMonthChange = (date: Date) => {
    const nextMonth = date.getMonth();
    const nextYear = date.getFullYear();
    if (
      displayMonthDate.getMonth() !== nextMonth ||
      displayMonthDate.getFullYear() !== nextYear
    ) {
      setDisplayMonthDate(date);
    }
  };

  const handleMonthShift = (offset: number) => {
    const base = displayMonthDate;
    const targetMonth = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    applyMonthYear(targetMonth.getMonth(), targetMonth.getFullYear());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Add Entry</Text>
          {saved ? (
            <View style={styles.savedBadge}>
              <Feather name="check" size={14} color={colors.accent} />
              <Text style={styles.savedText}>Saved</Text>
            </View>
          ) : null}
        </View>
        {settingsLoading ? <Text style={styles.loadingNotice}>Loading your preferences...</Text> : null}
        {error ? <ErrorBanner message={error} /> : null}

        <View style={[styles.card, styles.calendarCard]}>
          <View style={styles.calendarHeader}>
            <Pressable
              style={styles.monthButton}
              onPress={() => handleMonthShift(-1)}
            >
              <Text style={styles.monthButtonText}>{"<"}</Text>
            </Pressable>
            <Pressable
              style={styles.calendarTitleButton}
              onPress={() => setMonthPickerVisible(true)}
            >
              <Text style={styles.calendarTitle}>
                {displayMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
            </Pressable>
            <Pressable
              style={styles.monthButton}
              onPress={() => handleMonthShift(1)}
            >
              <Text style={styles.monthButtonText}>{">"}</Text>
            </Pressable>
          </View>

          <DayWheel
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(startOfDay(date))}
            onVisibleDateChange={handleVisibleMonthChange}
          />

          <View style={styles.quickDateRow}>
            <Pressable
              style={styles.todayButton}
              onPress={() => setSelectedDate(startOfDay(new Date()))}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
            <Pressable
              style={styles.todayButton}
              onPress={() => setSelectedDate(startOfDay(addDays(new Date(), -1)))}
            >
              <Text style={styles.todayButtonText}>Yesterday</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Drink</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {DRINK_CATEGORIES.map((item) => {
                const selected = item.key === category;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setCategory(item.key)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <View style={styles.chipContent}>
                      <DrinkIcon
                        category={item.key}
                        size={14}
                        color={selected ? colors.accentText : colors.text}
                      />
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {item.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Size</Text>
            <View style={styles.sizePillsRow}>
              {SIZE_OPTIONS[category].map((size) => {
                const selected = size === sizeL;
                return (
                  <Pressable
                    key={size}
                    onPress={() => setSizeL(size)}
                    style={[styles.sizePill, selected && styles.sizePillSelected]}
                  >
                    <Text style={[styles.sizePillText, selected && styles.sizePillTextSelected]}>
                      {formatSize(size, settings.unit)}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.sizePillMore}
                onPress={() => setSizeModalVisible(true)}
              >
                <Feather name="more-horizontal" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Count</Text>
            <View style={styles.countRow}>
              <Pressable
                style={styles.countButton}
                onPress={() => setCount((c) => String(Math.max(1, parseInt(c || "1", 10) - 1)))}
              >
                <Feather name="minus" size={18} color={colors.text} />
              </Pressable>
              <TextInput
                value={count}
                onChangeText={(text) => setCount(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                style={styles.countInput}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                style={styles.countButton}
                onPress={() => setCount((c) => String(Math.min(50, parseInt(c || "1", 10) + 1)))}
              >
                <Feather name="plus" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {category === "other" ? (
            <View style={styles.section}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Cider"
                style={styles.textInput}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ) : null}

          {category === "other" ? (
            <View style={styles.section}>
              <Text style={styles.label}>ABV % (optional, default 10)</Text>
              <TextInput
                value={abvInput}
                onChangeText={(value) => setAbvInput(value.replace(/[^0-9.,]/g, ""))}
                placeholder="10"
                keyboardType="decimal-pad"
                style={styles.textInput}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.rowCompact}>
              <View style={styles.dateTimeGroup}>
                <View style={[styles.rowItemCompact, styles.dateColumn]}>
                  <Text style={styles.label}>Date</Text>
                  <Text
                    style={[styles.valueText, styles.dateValueText]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {dateLabel}
                  </Text>
                </View>
                <View style={[styles.rowItemCompact, styles.timeColumn]}>
                  <Text style={styles.label}>Time</Text>
                  <View style={styles.timeRow}>
                    <Pressable style={styles.timeButton} onPress={() => setTimeModalVisible(true)}>
                      <Text style={styles.timeButtonText}>{pad2(hour)}</Text>
                    </Pressable>
                    <Text style={styles.timeSeparator}>:</Text>
                    <Pressable style={styles.timeButton} onPress={() => setTimeModalVisible(true)}>
                      <Text style={styles.timeButtonText}>{pad2(minute)}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.timeButtonSecondary}
                      onPress={() => {
                        const nowTime = new Date();
                        setHour(nowTime.getHours());
                        setMinute(Math.floor(nowTime.getMinutes() / 5) * 5);
                      }}
                    >
                      <Text style={styles.timeButtonTextDark}>Now</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Note</Text>
            <View style={styles.noteRow}>
              <Pressable style={styles.noteField} onPress={openNoteModal}>
                <MaterialIcons name="edit-note" size={20} color={colors.textMuted} />
                <Text style={note ? styles.noteText : styles.notePlaceholder} numberOfLines={2}>
                  {note || "Add a short note"}
                </Text>
              </Pressable>
              {note ? (
                <Pressable style={styles.clearNoteButton} onPress={clearNote}>
                  <Text style={styles.clearNoteText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Pressable
            style={[styles.nextEntryButton, busy && styles.nextEntryButtonDisabled]}
            onPress={handleNextEntry}
            disabled={busy}
          >
            <Feather name="plus" size={14} color={colors.accentText} />
            <Text style={styles.nextEntryText}>Add Another</Text>
          </Pressable>
        </View>

        {pendingEntries.length > 0 ? (
          <PendingEntriesCard
            entries={pendingEntries}
            unit={settings.unit}
        onRemove={handleRemovePending}
          />
        ) : null}

        <Pressable style={[styles.saveButton, busy && styles.saveButtonDisabled]} onPress={handleSave} disabled={busy}>
          <Text style={styles.saveText}>
            {saving ? "Saving..." : totalEntries > 1 ? `Save ${totalEntries} entries` : "Save entry"}
          </Text>
        </Pressable>
      </ScrollView>

      <SizePickerModal
        visible={sizeModalVisible}
        sizes={SIZE_OPTIONS[category]}
        unit={settings.unit}
        onClose={() => setSizeModalVisible(false)}
        onSelect={(size) => {
          setSizeL(size);
          setSizeModalVisible(false);
        }}
      />

      <MonthYearPickerModal
        visible={monthPickerVisible}
        month={displayMonthDate.getMonth()}
        year={displayMonthDate.getFullYear()}
        months={MONTHS}
        years={years}
        onClose={() => setMonthPickerVisible(false)}
        onChange={(nextMonth, nextYear) => applyMonthYear(nextMonth, nextYear)}
      />

      <TimePickerModal
        visible={timeModalVisible}
        hour={hour}
        minute={minute}
        onClose={() => setTimeModalVisible(false)}
        onChange={(nextHour, nextMinute) => {
          setHour(nextHour);
          setMinute(nextMinute);
        }}
      />

      <NoteModal
        visible={noteModalVisible}
        value={noteDraft}
        onChange={setNoteDraft}
        onClose={closeNoteModal}
        onClear={clearNote}
      />
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
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  loadingNotice: {
    color: colors.textMuted,
    marginBottom: 8,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  savedText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  calendarCard: {
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarTitleButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  monthButton: {
    width: 26,
    height: 26,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  monthButtonText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  todayButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  quickDateRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  todayButtonText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 12,
    color: colors.text,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sizePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  sizePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizePillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sizePillText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  sizePillTextSelected: {
    color: colors.accentText,
  },
  sizePillMore: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  nextEntryButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nextEntryButtonDisabled: {
    opacity: 0.6,
  },
  nextEntryText: {
    color: colors.accentText,
    fontWeight: "700",
    fontSize: 13,
  },
  chipTextSelected: {
    color: colors.accentText,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowItem: {
    flex: 1,
    gap: 6,
  },
  rowCompact: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 12,
  },
  rowItemCompact: {
    gap: 6,
    alignItems: "flex-start",
    flexShrink: 0,
  },
  dateTimeGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  dateColumn: {
    paddingRight: 6,
    width: 81,
  },
  timeColumn: {
    paddingLeft: 12,
    flexShrink: 1,
    minWidth: 0,
    flex: 1,
    maxHeight: 240,
  },
  dateValueText: {
    marginTop: 6,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownText: {
    color: colors.text,
    fontWeight: "600",
  },
  dropdownIcon: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  countInput: {
    width: 60,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    fontWeight: "600",
    color: colors.text,
  },
  valueText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  timeButtonSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  timeButtonText: {
    color: colors.accentText,
    fontWeight: "600",
  },
  timeSeparator: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  timeButtonTextDark: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.accentText,
    fontWeight: "600",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  noteField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
  },
  noteText: {
    color: colors.text,
    flex: 1,
  },
  notePlaceholder: {
    color: colors.textMuted,
    flex: 1,
  },
  clearNoteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearNoteText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
});
