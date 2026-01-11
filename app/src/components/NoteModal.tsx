import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type NoteModalProps = {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function NoteModal({ visible, value, onChange, onClose, onSave }: NoteModalProps) {
  const { colors, mode } = useTheme();
  const overlayColor = mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";
  const styles = useMemo(() => createStyles(colors, overlayColor), [colors, overlayColor]);
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
            placeholderTextColor={colors.textMuted}
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
    noteInput: {
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      textAlignVertical: "top",
      color: colors.text,
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
    modalButtonPrimary: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    modalButtonPrimaryText: {
      color: colors.accentText,
      fontWeight: "600",
    },
  });
