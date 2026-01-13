import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { formatSize, OUNCES_PER_LITER } from "../lib/drinks";
import { VolumeUnit } from "../lib/types";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type SizePickerModalProps = {
  visible: boolean;
  sizes: number[];
  unit: VolumeUnit;
  currentSize: number;
  onClose: () => void;
  onSelect: (size: number) => void;
};

const CUSTOM_MIN_L = 0.05;
const CUSTOM_MAX_L = 2.0;
const CUSTOM_MIN_OZ = 0.5;
const CUSTOM_MAX_OZ = 64;

export default function SizePickerModal({
  visible,
  sizes,
  unit,
  currentSize,
  onClose,
  onSelect,
}: SizePickerModalProps) {
  const { colors, mode } = useTheme();
  const overlayColor = mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";
  const styles = useMemo(() => createStyles(colors, overlayColor), [colors, overlayColor]);
  const step = unit === "oz" ? 0.5 / OUNCES_PER_LITER : 0.05;
  const minSize = unit === "oz" ? CUSTOM_MIN_OZ / OUNCES_PER_LITER : CUSTOM_MIN_L;
  const maxSize = unit === "oz" ? CUSTOM_MAX_OZ / OUNCES_PER_LITER : CUSTOM_MAX_L;
  const [customSize, setCustomSize] = useState(currentSize);

  useEffect(() => {
    if (!visible) return;
    const clamped = Math.min(Math.max(currentSize, minSize), maxSize);
    const rounded = Math.round(clamped / step) * step;
    setCustomSize(rounded);
  }, [visible, currentSize, minSize, maxSize, step]);

  const customLabel = formatSize(customSize, unit);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => null}>
          <Text style={styles.modalTitle}>Select size</Text>
          {sizes.map((size) => (
            <Pressable key={size} style={styles.modalOption} onPress={() => onSelect(size)}>
              <Text style={styles.modalOptionText}>{formatSize(size, unit)}</Text>
            </Pressable>
          ))}
          <View style={styles.customSection}>
            <View style={styles.customHeader}>
              <Text style={styles.customTitle}>Custom size</Text>
              <Text style={styles.customValue}>{customLabel}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={minSize}
              maximumValue={maxSize}
              step={step}
              value={customSize}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accent}
              onValueChange={setCustomSize}
            />
            <Pressable style={styles.customButton} onPress={() => onSelect(customSize)}>
              <Text style={styles.customButtonText}>Use {customLabel}</Text>
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
    modalOption: {
      paddingVertical: 10,
    },
    modalOptionText: {
      fontSize: 16,
      color: colors.text,
    },
    customSection: {
      marginTop: 6,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    customHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    customTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    customValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    slider: {
      width: "100%",
      height: 32,
    },
    customButton: {
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: colors.accent,
    },
    customButtonText: {
      color: colors.accentText,
      fontWeight: "700",
    },
  });
