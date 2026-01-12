import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/theme";

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: "#c44949",
      backgroundColor: "#f9e8e8",
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    title: {
      color: "#8f3a3a",
      fontWeight: "700",
    },
    message: {
      color: colors.text,
    },
    button: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: "#c44949",
    },
    buttonText: {
      color: "#f7f2ee",
      fontWeight: "700",
    },
  });
