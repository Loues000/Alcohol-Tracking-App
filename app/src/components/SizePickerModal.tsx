import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text } from "react-native";
import { formatSize } from "../lib/drinks";
import { VolumeUnit } from "../lib/types";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type SizePickerModalProps = {
  visible: boolean;
  sizes: number[];
  unit: VolumeUnit;
  onClose: () => void;
  onSelect: (size: number) => void;
};

export default function SizePickerModal({
  visible,
  sizes,
  unit,
  onClose,
  onSelect,
}: SizePickerModalProps) {
  const { colors, mode } = useTheme();
  const overlayColor = mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";
  const styles = useMemo(() => createStyles(colors, overlayColor), [colors, overlayColor]);
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
  });
