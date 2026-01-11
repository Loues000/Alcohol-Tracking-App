import { Modal, Pressable, StyleSheet, Text } from "react-native";
import { formatSize } from "../lib/drinks";
import { VolumeUnit } from "../lib/types";

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

const styles = StyleSheet.create({
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
});
