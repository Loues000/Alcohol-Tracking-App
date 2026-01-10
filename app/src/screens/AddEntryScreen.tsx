import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import DrinkIcon from "../components/DrinkIcon";
import { DRINK_CATEGORIES, SIZE_OPTIONS, formatSize } from "../lib/drinks";
import { addDays, formatDateInput, pad2, startOfDay, toDateKey } from "../lib/dates";
import { useEntries } from "../lib/entries-context";
import { useLocalSettings } from "../lib/local-settings";
import { DrinkCategory } from "../lib/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const DAY_RANGE_DAYS = 365 * 25;
const DAY_ITEM_WIDTH = 50;
const DAY_ITEM_GAP = 8;
const DAY_ITEM_SPAN = DAY_ITEM_WIDTH + DAY_ITEM_GAP;

type PendingEntry = {
  id: string;
  category: DrinkCategory;
  size_l: number;
  count: number;
};

export default function AddEntryScreen() {
  const { createEntries, error } = useEntries();
  const { settings, loading: settingsLoading } = useLocalSettings();
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(startOfDay(now));
  const [category, setCategory] = useState<DrinkCategory>("beer");
  const [sizeL, setSizeL] = useState(SIZE_OPTIONS.beer[0]);
  const [count, setCount] = useState("1");
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(Math.floor(now.getMinutes() / 5) * 5);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [note, setNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  useEffect(() => {
    if (!SIZE_OPTIONS[category].includes(sizeL)) {
      setSizeL(SIZE_OPTIONS[category][0]);
    }
  }, [category, sizeL]);

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

  const handleSave = async () => {
    setSaving(true);
    const consumedAt = new Date(selectedDate);
    consumedAt.setHours(hour, minute, 0, 0);

    const noteValue = note.trim().length > 0 ? note.trim() : null;
    const entriesToSave: PendingEntry[] = [
      ...pendingEntries,
      {
        id: "current",
        category,
        size_l: sizeL,
        count: parsedCount,
      },
    ];
    const inputs = entriesToSave.flatMap((entry) =>
      Array.from({ length: entry.count }, () => ({
        consumed_at: consumedAt.toISOString(),
        category: entry.category,
        size_l: entry.size_l,
        note: noteValue,
      }))
    );

    const created = await createEntries(inputs);
    setSaving(false);

    if (created.length === 0) {
      Alert.alert("Entry not saved", error ?? "Please try again.");
      return;
    }

    setSaved(true);
    setPendingEntries([]);
    setCount("1");
    setTimeout(() => setSaved(false), 2000);
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
    const entry: PendingEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      category,
      size_l: sizeL,
      count: parsedCount,
    };
    setPendingEntries((prev) => [...prev, entry]);

    const fallbackCategory = settings.defaultCategory ?? "beer";
    const fallbackSize = settings.defaultSizeL ?? SIZE_OPTIONS[fallbackCategory][0];
    setCategory(fallbackCategory);
    setSizeL(fallbackSize);
    setCount("1");
  };

  const handleRemovePending = (id: string) => {
    setPendingEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const dateLabel = formatDateInput(selectedDate);
  const totalEntries = pendingEntries.reduce((sum, entry) => sum + entry.count, 0) + parsedCount;

  const handleMonthShift = (offset: number) => {
    const targetMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1);
    const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    const nextDay = Math.min(selectedDate.getDate(), daysInMonth);
    const nextDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), nextDay);
    setSelectedDate(startOfDay(nextDate));
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
            <Text style={styles.calendarTitle}>
              {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
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
          />

          <Pressable style={styles.todayButton} onPress={() => setSelectedDate(startOfDay(new Date()))}>
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Drink</Text>
            <View style={styles.chipRow}>
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
            </View>
          </View>

          <View style={styles.rowBetween}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Size</Text>
              <Pressable style={styles.dropdown} onPress={() => setSizeModalVisible(true)}>
                <Text style={styles.dropdownText}>{formatSize(sizeL, settings.unit)}</Text>
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

          <View style={styles.rowBetween}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.valueText}>{dateLabel}</Text>
            </View>
            <View style={styles.rowItem}>
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

          <View style={styles.section}>
            <Text style={styles.label}>Note</Text>
            <Pressable style={styles.noteButton} onPress={openNoteModal}>
              <Text style={styles.noteButtonText}>{note ? "Edit note" : "Add note"}</Text>
            </Pressable>
            {note ? <Text style={styles.notePreview}>{note}</Text> : null}
          </View>

          <Pressable style={styles.nextEntryButton} onPress={handleNextEntry}>
            <Text style={styles.nextEntryText}>Next Entry</Text>
          </Pressable>
        </View>

        {pendingEntries.length > 0 ? (
          <View style={[styles.card, styles.queueCard]}>
            <Text style={styles.cardTitle}>Pending entries</Text>
            <View style={styles.queueList}>
              {pendingEntries.map((entry) => (
                <View key={entry.id} style={styles.queueItem}>
                  <View style={styles.queueInfo}>
                    <DrinkIcon category={entry.category} size={14} color="#2b2b2b" />
                    <Text style={styles.queueText}>
                      {DRINK_CATEGORIES.find((item) => item.key === entry.category)?.label} -{" "}
                      {formatSize(entry.size_l, settings.unit)} - x{entry.count}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemovePending(entry.id)}>
                    <Text style={styles.queueRemove}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
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

      <Modal visible={sizeModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSizeModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => null}>
            <Text style={styles.modalTitle}>Select size</Text>
            {SIZE_OPTIONS[category].map((size) => (
              <Pressable
                key={`${category}-${size}`}
                style={styles.modalOption}
                onPress={() => {
                  setSizeL(size);
                  setSizeModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{formatSize(size, settings.unit)}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

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

      <Modal visible={noteModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setNoteModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => null}>
            <Text style={styles.modalTitle}>Note</Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              style={styles.noteInput}
              placeholder="Add a note"
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButton} onPress={() => setNoteModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={applyNote}>
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

type DayWheelProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

function DayWheel({ selectedDate, onSelectDate }: DayWheelProps) {
  const listRef = useRef<FlatList<Date>>(null);
  const { width } = useWindowDimensions();
  const anchorDate = useMemo(() => startOfDay(new Date()), []);
  const startDate = useMemo(() => addDays(anchorDate, -DAY_RANGE_DAYS), [anchorDate]);
  const days = useMemo(
    () => Array.from({ length: DAY_RANGE_DAYS * 2 + 1 }, (_, index) => addDays(startDate, index)),
    [startDate]
  );
  const todayKey = useMemo(() => toDateKey(startOfDay(new Date())), []);

  const indexForDate = (date: Date) => {
    const diff = Math.round((startOfDay(date).getTime() - startDate.getTime()) / 86400000);
    return Math.min(Math.max(diff, 0), days.length - 1);
  };

  useEffect(() => {
    const index = indexForDate(selectedDate);
    listRef.current?.scrollToIndex({ index, animated: true });
  }, [selectedDate, startDate]);

  const padding = Math.max(0, (width - DAY_ITEM_WIDTH) / 2);

  return (
    <FlatList
      ref={listRef}
      data={days}
      horizontal
      keyExtractor={(item) => toDateKey(item)}
      showsHorizontalScrollIndicator={false}
      snapToInterval={DAY_ITEM_SPAN}
      snapToAlignment="center"
      decelerationRate="fast"
      contentContainerStyle={[styles.dayWheel, { paddingHorizontal: padding }]}
      getItemLayout={(_, index) => ({
        length: DAY_ITEM_SPAN,
        offset: DAY_ITEM_SPAN * index,
        index,
      })}
      initialScrollIndex={indexForDate(selectedDate)}
      onScrollToIndexFailed={({ index }) => {
        const clampedIndex = Math.min(Math.max(index, 0), days.length - 1);
        listRef.current?.scrollToIndex({ index: clampedIndex, animated: false });
      }}
      onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / DAY_ITEM_SPAN);
        const nextDate = days[index];
        if (nextDate) {
          onSelectDate(startOfDay(nextDate));
        }
      }}
      ItemSeparatorComponent={() => <View style={{ width: DAY_ITEM_GAP }} />}
      renderItem={({ item }) => {
        const key = toDateKey(item);
        const isSelected = key === toDateKey(selectedDate);
        const isToday = key === todayKey;
        return (
          <Pressable
            onPress={() => onSelectDate(startOfDay(item))}
            style={[
              styles.dayWheelItem,
              isSelected && styles.dayWheelItemSelected,
              isToday && styles.dayWheelItemToday,
            ]}
          >
            <Text style={[styles.dayWheelWeekday, isSelected && styles.dayWheelTextSelected]}>
              {item.toLocaleDateString("en-US", { weekday: "short" })}
            </Text>
            <Text style={[styles.dayWheelDay, isSelected && styles.dayWheelTextSelected]}>
              {item.getDate()}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

type TimePickerModalProps = {
  visible: boolean;
  hour: number;
  minute: number;
  onClose: () => void;
  onChange: (hour: number, minute: number) => void;
};

function TimePickerModal({ visible, hour, minute, onClose, onChange }: TimePickerModalProps) {
  const [tempHour, setTempHour] = useState(hour);
  const [tempMinute, setTempMinute] = useState(minute);

  useEffect(() => {
    if (!visible) return;
    setTempHour(hour);
    setTempMinute(minute);
  }, [visible, hour, minute]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => null}>
          <Text style={styles.modalTitle}>Select time</Text>
          <View style={styles.timePickerRow}>
            <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
              {HOURS.map((value) => {
                const selected = value === tempHour;
                return (
                  <Pressable
                    key={`hour-${value}`}
                    style={[styles.timeOption, selected && styles.timeOptionSelected]}
                    onPress={() => setTempHour(value)}
                  >
                    <Text style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}>
                      {pad2(value)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
              {MINUTES.map((value) => {
                const selected = value === tempMinute;
                return (
                  <Pressable
                    key={`minute-${value}`}
                    style={[styles.timeOption, selected && styles.timeOptionSelected]}
                    onPress={() => setTempMinute(value)}
                  >
                    <Text style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}>
                      {pad2(value)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.modalButtonPrimary}
              onPress={() => {
                onChange(tempHour, tempMinute);
                onClose();
              }}
            >
              <Text style={styles.modalButtonPrimaryText}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  dayWheel: {
    paddingVertical: 6,
  },
  dayWheelItem: {
    width: DAY_ITEM_WIDTH,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#f6f4f1",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayWheelItemSelected: {
    backgroundColor: "#1c6b4f",
    borderColor: "#1c6b4f",
  },
  dayWheelItemToday: {
    borderColor: "#1c6b4f",
  },
  dayWheelWeekday: {
    fontSize: 10,
    color: "#6a645d",
    fontWeight: "600",
  },
  dayWheelDay: {
    fontSize: 16,
    color: "#2b2724",
    fontWeight: "700",
  },
  dayWheelTextSelected: {
    color: "#f5f3ee",
  },
  todayButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ece7e2",
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
    flexWrap: "wrap",
    gap: 8,
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
  queueCard: {
    gap: 10,
  },
  queueList: {
    marginTop: 6,
    gap: 6,
  },
  queueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#f6f4f1",
  },
  queueInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  queueText: {
    fontSize: 12,
    color: "#2b2724",
  },
  queueRemove: {
    fontSize: 12,
    color: "#8f3a3a",
    fontWeight: "600",
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
  dropdown: {
    borderWidth: 1,
    borderColor: "#d6d1cc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  dropdownText: {
    color: "#2b2724",
    fontWeight: "600",
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
  valueText: {
    fontSize: 14,
    color: "#2b2724",
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ece7e2",
    alignItems: "center",
  },
  noteButtonText: {
    color: "#3b3530",
    fontWeight: "600",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2b2724",
  },
  modalOption: {
    paddingVertical: 10,
  },
  modalOptionText: {
    fontSize: 16,
    color: "#2b2724",
  },
  noteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#d6d1cc",
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ece7e2",
  },
  modalButtonText: {
    color: "#3b3530",
    fontWeight: "600",
  },
  modalButtonPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1c6b4f",
  },
  modalButtonPrimaryText: {
    color: "#f5f3ee",
    fontWeight: "600",
  },
  timePickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeColumn: {
    flex: 1,
    maxHeight: 240,
  },
  timeOption: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  timeOptionSelected: {
    backgroundColor: "#1c6b4f",
  },
  timeOptionText: {
    fontSize: 16,
    color: "#2b2724",
  },
  timeOptionTextSelected: {
    color: "#f5f3ee",
    fontWeight: "600",
  },
});
