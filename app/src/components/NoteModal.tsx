import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type NoteModalProps = {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function NoteModal({ visible, value, onChange, onClose, onSave }: NoteModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => null}>
          <Text style={styles.modalTitle}>Note</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            style={styles.noteInput}
            placeholder="Add a note"
            multiline
          />
          <View style={styles.modalActions}>
            <Pressable style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalButtonPrimary} onPress={onSave}>
              <Text style={styles.modalButtonPrimaryText}>Save</Text>
            </Pressable>
          </View>
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
});
