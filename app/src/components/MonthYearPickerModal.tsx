import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type MonthYearPickerModalProps = {
  visible: boolean;
  month: number;
  year: number;
  months: string[];
  years: number[];
  onClose: () => void;
  onChange: (month: number, year: number) => void;
};

export default function MonthYearPickerModal({
  visible,
  month,
  year,
  months,
  years,
  onClose,
  onChange,
}: MonthYearPickerModalProps) {
  const { colors, mode } = useTheme();
  const overlayColor = mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";
  const styles = useMemo(() => createStyles(colors, overlayColor), [colors, overlayColor]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => null}>
          <Text style={styles.modalTitle}>Select month and year</Text>
          <View style={styles.pickerRow}>
            <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
              {months.map((label, index) => {
                const selected = index === month;
                return (
                  <Pressable
                    key={label}
                    style={[styles.pickerOption, selected && styles.pickerOptionSelected]}
                    onPress={() => onChange(index, year)}
                  >
                    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
              {years.map((value) => {
                const selected = value === year;
                return (
                  <Pressable
                    key={value}
                    style={[styles.pickerOption, selected && styles.pickerOptionSelected]}
                    onPress={() => onChange(month, value)}
                  >
                    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: Theme["colors"], overlayColor: string) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: overlayColor,
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      padding: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      gap: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    pickerRow: {
      flexDirection: "row",
      gap: 12,
    },
    pickerColumn: {
      flexShrink: 1,
      minWidth: 0,
      flex: 1,
      maxHeight: 240,
    },
    pickerOption: {
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 8,
    },
    pickerOptionSelected: {
      backgroundColor: colors.accent,
    },
    pickerOptionText: {
      fontSize: 16,
      color: colors.text,
    },
    pickerOptionTextSelected: {
      color: colors.accentText,
      fontWeight: "600",
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
      backgroundColor: colors.surfaceMuted,
    },
    modalButtonText: {
      color: colors.textMuted,
      fontWeight: "600",
    },
  });
