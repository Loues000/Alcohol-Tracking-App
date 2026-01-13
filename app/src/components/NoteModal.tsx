import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type NoteModalProps = {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onClear?: () => void;
};

export default function NoteModal({ visible, value, onChange, onClose, onClear }: NoteModalProps) {
  const { colors, mode } = useTheme();
  const overlayColor = mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";
  const styles = useMemo(() => createStyles(colors, overlayColor), [colors, overlayColor]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
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
              autoFocus
            />
            <View style={styles.modalActions}>
              {onClear ? (
                <Pressable style={styles.modalButtonSecondary} onPress={onClear}>
                  <Text style={styles.modalButtonSecondaryText}>Clear note</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.modalButtonPrimary} onPress={onClose}>
                <Text style={styles.modalButtonPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: Theme["colors"], overlayColor: string) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: overlayColor,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 20,
      marginHorizontal: 8,
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
    modalButtonSecondary: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonSecondaryText: {
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
