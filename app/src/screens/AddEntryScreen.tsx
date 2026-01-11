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
import { MaterialIcons } from "@expo/vector-icons";
import DrinkIcon from "../components/DrinkIcon";
import DayWheel from "../components/DayWheel";
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
};

export default function AddEntryScreen() {
  const { createEntries, error } = useEntries();
  const { settings, loading: settingsLoading } = useLocalSettings();
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

  useEffect(() => {
    if (!SIZE_OPTIONS[category].includes(sizeL)) {
      setSizeL(SIZE_OPTIONS[category][0]);
    }
  }, [category, sizeL]);

  useEffect(() => {
    const defaultAbv = DEFAULT_ABV[category];
    if (category === "other") {
      setAbvInput("");
      return;
    }
    if (defaultAbv !== null && defaultAbv !== undefined) {
      setAbvInput(`${defaultAbv}`);
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
    const trimmedAbv = abvInput.trim();
    const normalizedAbv = trimmedAbv.replace(",", ".");
    const defaultAbv = DEFAULT_ABV[category];
    const parsedAbv =
      trimmedAbv.length === 0
        ? defaultAbv !== null && defaultAbv !== undefined
          ? defaultAbv
          : null
        : Number(normalizedAbv);

    if (category === "other") {
      const trimmedName = customName.trim();
      if (!trimmedName) {
        Alert.alert("Missing name", "Please add a name for Other.");
        return null;
      }
      if (parsedAbv === null || !Number.isFinite(parsedAbv) || parsedAbv <= 0 || parsedAbv > 100) {
        Alert.alert("Check ABV", "Enter a number between 0 and 100.");
        return null;
      }
      return { custom_name: trimmedName, abv_percent: parsedAbv };
    }

    if (parsedAbv !== null && (!Number.isFinite(parsedAbv) || parsedAbv <= 0 || parsedAbv > 100)) {
      Alert.alert("Check ABV", "Enter a number between 0 and 100.");
      return null;
    }

    return { custom_name: null, abv_percent: parsedAbv };
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
        },
      ];
      const inputs = entriesToSave.flatMap((entry) =>
        Array.from({ length: entry.count }, () => ({
          consumed_at: consumedAt.toISOString(),
          category: entry.category,
          size_l: entry.size_l,
          note: noteValue,
          custom_name: entry.category === "other" ? entry.custom_name ?? null : null,
          abv_percent: entry.abv_percent ?? null,
        }))
      );

      const created = await createEntries(inputs);
      if (created.length === 0) {
        Alert.alert("Entry not saved", error ?? "Please try again.");
        return;
      }

      setSaved(true);
      setPendingEntries([]);
      setCount("1");
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const openNoteModal = () => {
    setNoteDraft(note);
    setNoteModalVisible(true);
  };

  const applyNote = () => {
    setNote(noteDraft);
    setNoteModalVisible(false);
  };

  const handleNextEntry = () => {
    const entryFields = validateEntryFields();
    if (!entryFields) return;

    const entry: PendingEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      category,
      size_l: sizeL,
      count: parsedCount,
      ...entryFields,
    };
    setPendingEntries((prev) => [...prev, entry]);

    const fallbackCategory = settings.defaultCategory ?? "beer";
    const fallbackSize = settings.defaultSizeL ?? SIZE_OPTIONS[fallbackCategory][0];
    setCategory(fallbackCategory);
    setSizeL(fallbackSize);
    setCount("1");
    setCustomName("");
    if (fallbackCategory === "other") {
      setAbvInput("");
    } else if (DEFAULT_ABV[fallbackCategory] !== null && DEFAULT_ABV[fallbackCategory] !== undefined) {
      setAbvInput(`${DEFAULT_ABV[fallbackCategory]}`);
    }
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
          {saved ? <Text style={styles.saved}>Saved</Text> : null}
        </View>

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
                        color={selected ? "#f8f5f1" : "#2b2b2b"}
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

          <View style={styles.rowBetween}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Size</Text>
              <Pressable style={styles.dropdown} onPress={() => setSizeModalVisible(true)}>
                <Text style={styles.dropdownText}>{formatSize(sizeL, settings.unit)}</Text>
                <Text style={styles.dropdownIcon}>v</Text>
              </Pressable>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Count</Text>
              <TextInput
                value={count}
                onChangeText={(text) => setCount(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                style={styles.countInput}
                placeholder="1"
              />
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
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>ABV %</Text>
            <TextInput
              value={abvInput}
              onChangeText={(value) => setAbvInput(value.replace(/[^0-9.,]/g, ""))}
              placeholder="e.g. 5"
              keyboardType="decimal-pad"
              style={styles.textInput}
            />
          </View>

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
              <View style={[styles.rowItemCompact, styles.noteColumn]}>
                <Text style={styles.label}>Note</Text>
                <Pressable style={styles.noteButton} onPress={openNoteModal}>
                  <MaterialIcons name="edit-note" size={20} color="#3b3530" />
                </Pressable>
              </View>
            </View>
            {note ? <Text style={styles.notePreview}>{note}</Text> : null}
          </View>

          <Pressable style={styles.nextEntryButton} onPress={handleNextEntry}>
            <Text style={styles.nextEntryText}>Next Entry</Text>
          </Pressable>
        </View>

        {pendingEntries.length > 0 ? (
          <PendingEntriesCard
            entries={pendingEntries}
            unit={settings.unit}
            onRemove={handleRemovePending}
          />
        ) : null}

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
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
        onClose={() => setNoteModalVisible(false)}
        onSave={applyNote}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4ef",
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
    color: "#1f1c1a",
  },
  saved: {
    color: "#1c6b4f",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece6e1",
    gap: 12,
  },
  calendarCard: {
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2b2724",
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
    color: "#2b2724",
  },
  monthButton: {
    width: 26,
    height: 26,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0ebe6",
  },
  monthButtonText: {
    fontSize: 16,
    color: "#4b443d",
  },
  todayButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ece7e2",
  },
  quickDateRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  todayButtonText: {
    fontSize: 12,
    color: "#3b3530",
    fontWeight: "600",
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: "#6a645d",
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
    borderColor: "#d6d1cc",
    backgroundColor: "#f6f4f1",
  },
  chipSelected: {
    backgroundColor: "#2b2b2b",
    borderColor: "#2b2b2b",
  },
  chipText: {
    fontSize: 12,
    color: "#2b2b2b",
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nextEntryButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1c6b4f",
  },
  nextEntryText: {
    color: "#f5f3ee",
    fontWeight: "600",
    fontSize: 12,
  },
  chipTextSelected: {
    color: "#f8f5f1",
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
  noteColumn: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginLeft: "auto",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#d6d1cc",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f0ebe6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownText: {
    color: "#2b2724",
    fontWeight: "600",
  },
  dropdownIcon: {
    color: "#6a645d",
    fontWeight: "700",
  },
  countInput: {
    borderWidth: 1,
    borderColor: "#d6d1cc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d6d1cc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    fontWeight: "600",
  },
  valueText: {
    fontSize: 14,
    color: "#2b2724",
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
    backgroundColor: "#2b2b2b",
  },
  timeButtonSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#ece7e2",
  },
  timeButtonText: {
    color: "#f8f5f1",
    fontWeight: "600",
  },
  timeSeparator: {
    color: "#6a645d",
    fontWeight: "600",
  },
  timeButtonTextDark: {
    color: "#3b3530",
    fontWeight: "600",
  },
  noteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ece7e2",
    alignItems: "center",
    justifyContent: "center",
  },
  notePreview: {
    color: "#3f3a35",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#1c6b4f",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: "#f5f3ee",
    fontWeight: "600",
  },
});
