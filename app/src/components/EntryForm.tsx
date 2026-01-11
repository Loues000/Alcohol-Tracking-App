import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { DEFAULT_ABV, DRINK_CATEGORIES, SIZE_OPTIONS, formatSize } from "../lib/drinks";
import { addDays, addMinutes, formatDateInput, formatTimeInput, parseDateTimeInput } from "../lib/dates";
import { DrinkCategory, VolumeUnit } from "../lib/types";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

export type EntryFormValues = {
  category: DrinkCategory;
  size_l: number;
  datetime: Date;
  note: string;
  custom_name: string | null;
  abv_percent: number | null;
};

type EntryFormProps = {
  initialValues?: EntryFormValues;
  onSubmit: (values: EntryFormValues) => Promise<void> | void;
  submitLabel: string;
  onCancel?: () => void;
  unit?: VolumeUnit;
  busy?: boolean;
};

const fallbackCategory: DrinkCategory = "beer";

export default function EntryForm({
  initialValues,
  onSubmit,
  submitLabel,
  onCancel,
  unit = "l",
  busy = false,
}: EntryFormProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedInitial = useMemo(() => {
    const category = initialValues?.category ?? fallbackCategory;
    const size = initialValues?.size_l ?? SIZE_OPTIONS[category][0];
    const datetime = initialValues?.datetime ?? new Date();
    const note = initialValues?.note ?? "";
    const customName = initialValues?.custom_name ?? "";
    const abvValue = initialValues?.abv_percent;
    const abvInput =
      typeof abvValue === "number" && Number.isFinite(abvValue) ? `${abvValue}` : "";
    return { category, size, datetime, note, customName, abvInput };
  }, [initialValues]);

  const [category, setCategory] = useState<DrinkCategory>(resolvedInitial.category);
  const [sizeL, setSizeL] = useState(resolvedInitial.size);
  const [datetime, setDatetime] = useState(resolvedInitial.datetime);
  const [note, setNote] = useState(resolvedInitial.note);
  const [customName, setCustomName] = useState(resolvedInitial.customName);
  const [abvInput, setAbvInput] = useState(resolvedInitial.abvInput);
  const [dateInput, setDateInput] = useState(formatDateInput(resolvedInitial.datetime));
  const [timeInput, setTimeInput] = useState(formatTimeInput(resolvedInitial.datetime));

  useEffect(() => {
    setCategory(resolvedInitial.category);
    setSizeL(resolvedInitial.size);
    setDatetime(resolvedInitial.datetime);
    setNote(resolvedInitial.note);
    setCustomName(resolvedInitial.customName);
    setAbvInput(resolvedInitial.abvInput);
    setDateInput(formatDateInput(resolvedInitial.datetime));
    setTimeInput(formatTimeInput(resolvedInitial.datetime));
  }, [resolvedInitial]);

  useEffect(() => {
    const sizes = SIZE_OPTIONS[category];
    if (!sizes.includes(sizeL)) {
      setSizeL(sizes[0]);
    }
  }, [category, sizeL]);

  useEffect(() => {
    if (category !== "other") {
      setCustomName("");
      setAbvInput("");
    }
  }, [category]);

  const applyDate = (next: Date) => {
    setDatetime(next);
    setDateInput(formatDateInput(next));
    setTimeInput(formatTimeInput(next));
  };

  const handleSubmit = async () => {
    const parsed = parseDateTimeInput(dateInput.trim(), timeInput.trim());
    if (!parsed) {
      Alert.alert("Check date/time", "Use YYYY-MM-DD and HH:mm.");
      return;
    }

    let customNameValue: string | null = null;
    const trimmedAbv = abvInput.trim();
    const normalizedAbv = trimmedAbv.replace(",", ".");
    const parsedAbv = trimmedAbv.length > 0 ? Number(normalizedAbv) : DEFAULT_ABV.other ?? 10;
    const shouldUseCustomAbv = category === "other";

    if (category === "other") {
      const trimmedName = customName.trim();
      if (!trimmedName) {
        Alert.alert("Missing name", "Please add a name for Other.");
        return;
      }
      if (!Number.isFinite(parsedAbv) || parsedAbv <= 0 || parsedAbv > 100) {
        Alert.alert("Check ABV", "Enter a number between 0 and 100.");
        return;
      }
      customNameValue = trimmedName;
    }

    await onSubmit({
      category,
      size_l: sizeL,
      datetime: parsed,
      note: note.trim(),
      custom_name: customNameValue,
      abv_percent: shouldUseCustomAbv ? parsedAbv : null,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Drink type</Text>
        <View style={styles.chipRow}>
          {DRINK_CATEGORIES.map((option) => {
            const selected = option.key === category;
            return (
              <Pressable
                key={option.key}
                onPress={() => setCategory(option.key)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Size</Text>
        <View style={styles.chipRow}>
          {SIZE_OPTIONS[category].map((size) => {
            const selected = size === sizeL;
            return (
              <Pressable
                key={`${category}-${size}`}
                onPress={() => setSizeL(size)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {formatSize(size, unit)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {category === "other" ? (
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="e.g. Cider"
            style={styles.noteInput}
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
            style={styles.noteInput}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Date and time</Text>
        <View style={styles.dateRow}>
          <TextInput
            value={dateInput}
            onChangeText={setDateInput}
            style={styles.dateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TextInput
            value={timeInput}
            onChangeText={setTimeInput}
            style={styles.timeInput}
            placeholder="HH:mm"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.quickRow}>
          <Pressable style={styles.quickChip} onPress={() => applyDate(new Date())}>
            <Text style={styles.quickChipText}>Now</Text>
          </Pressable>
          <Pressable style={styles.quickChip} onPress={() => applyDate(addMinutes(new Date(), -60))}>
            <Text style={styles.quickChipText}>1h ago</Text>
          </Pressable>
          <Pressable style={styles.quickChip} onPress={() => applyDate(addDays(new Date(), -1))}>
            <Text style={styles.quickChipText}>Yesterday</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a short note"
          style={styles.noteInput}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.buttonRow}>
        {onCancel ? (
          <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.actionButton, styles.saveButton, busy && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          <Text style={styles.saveText}>{busy ? "Saving..." : submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    color: colors.text,
    fontSize: 13,
  },
  chipTextSelected: {
    color: colors.accentText,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  timeInput: {
    width: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  quickChipText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.accentText,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: colors.surfaceMuted,
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
});
