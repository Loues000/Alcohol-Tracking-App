import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { DRINK_CATEGORIES, SIZE_OPTIONS, formatSize } from "../lib/drinks";
import { useLocalSettings } from "../lib/local-settings";
import { useProfile } from "../lib/profile-context";
import { useEntries } from "../lib/entries-context";
import { supabase } from "../lib/supabase";
import { DrinkCategory, VolumeUnit } from "../lib/types";
import { ACCENT_COLORS, ThemeAccent, ThemeMode } from "../lib/theme";
import type { Theme } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

const THEME_ACCENTS: Array<{ key: ThemeAccent; label: string; color: string }> = [
  { key: "beer", label: "Beer", color: ACCENT_COLORS.beer },
  { key: "wine", label: "Wine", color: ACCENT_COLORS.wine },
  { key: "vodka", label: "Vodka", color: ACCENT_COLORS.vodka },
  { key: "caipirinha", label: "Caipirinha", color: ACCENT_COLORS.caipirinha },
];

export default function ProfileScreen() {
  const { profile, updateProfile, error } = useProfile();
  const { entries } = useEntries();
  const { settings, updateSettings } = useLocalSettings();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
  }, [profile]);

  const handleSaveName = async () => {
    setSaving(true);
    const updated = await updateProfile({
      display_name: displayName.trim().length > 0 ? displayName.trim() : "",
    });
    setSaving(false);
    setEditingName(false);
    if (!updated) {
      Alert.alert("Save failed", error ?? "Please try again.");
    }
  };

  const handleThemeToggle = async (isDark: boolean) => {
    await updateSettings({ themeMode: isDark ? "dark" : "light" });
  };

  const handleAccentChange = async (accent: ThemeAccent) => {
    await updateSettings({ themeAccent: accent });
  };

  const handleUnitChange = async (unit: VolumeUnit) => {
    await updateSettings({ unit });
  };

  const logout = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) Alert.alert("Sign out failed", signOutError.message);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This deletes your account and all entries. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: handleDeleteAccount,
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error: rpcError } = await supabase.rpc("delete_account");

    if (rpcError) {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        await supabase.from("entries").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("id", userId);
      }
    }

    await supabase.auth.signOut();
    setDeleting(false);

    if (rpcError) {
      Alert.alert(
        "Data removed",
        "Your entries were deleted, but the auth account could not be removed."
      );
    }
  };

  const handleExport = async () => {
    try {
      const payload = JSON.stringify(entries, null, 2);
      await Share.share({ message: payload });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Export failed", message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Feather name="user" size={32} color={colors.textMuted} />
          </View>
          <View style={styles.headerInfo}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Display name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.nameInput}
                  autoFocus
                />
                <Pressable
                  style={styles.nameButton}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  <Feather name="check" size={18} color={colors.accent} />
                </Pressable>
                <Pressable
                  style={styles.nameButton}
                  onPress={() => {
                    setDisplayName(profile?.display_name ?? "");
                    setEditingName(false);
                  }}
                >
                  <Feather name="x" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.nameRow} onPress={() => setEditingName(true)}>
                <Text style={styles.displayName}>
                  {displayName || "Add display name"}
                </Text>
                <Feather name="edit-2" size={14} color={colors.textMuted} />
              </Pressable>
            )}
            <Text style={styles.email}>{email ?? "Loading..."}</Text>
          </View>
        </View>

        {/* Settings List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          {/* Dark Mode Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="moon" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Dark mode</Text>
            </View>
            <Switch
              value={mode === "dark"}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.separator} />

          {/* Accent Color */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="droplet" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Accent color</Text>
            </View>
            <View style={styles.colorDots}>
              {THEME_ACCENTS.map((accent) => (
                <Pressable
                  key={accent.key}
                  onPress={() => handleAccentChange(accent.key)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: accent.color },
                    settings.themeAccent === accent.key && styles.colorDotSelected,
                    settings.themeAccent === accent.key && { borderColor: colors.text },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Units */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="maximize-2" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Units</Text>
            </View>
            <View style={styles.unitChips}>
              {(["l", "ml", "cl", "oz"] as VolumeUnit[]).map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => handleUnitChange(unit)}
                  style={[
                    styles.unitChip,
                    settings.unit === unit && styles.unitChipSelected,
                    settings.unit === unit && { backgroundColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      settings.unit === unit && styles.unitChipTextSelected,
                      settings.unit === unit && { color: colors.accentText },
                    ]}
                  >
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <Pressable style={styles.actionRow} onPress={handleExport}>
            <View style={styles.rowLeft}>
              <Feather name="download" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Export data (JSON)</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable style={styles.actionRow} onPress={logout}>
            <View style={styles.rowLeft}>
              <Feather name="log-out" size={18} color={colors.text} />
              <Text style={styles.rowLabel}>Sign out</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.separator} />

          <Pressable
            style={styles.actionRow}
            onPress={confirmDeleteAccount}
            disabled={deleting}
          >
            <View style={styles.rowLeft}>
              <Feather name="trash-2" size={18} color="#8f3a3a" />
              <Text style={[styles.rowLabel, styles.deleteLabel]}>
                {deleting ? "Deleting..." : "Delete account"}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          Your data is stored securely. Export creates a JSON backup of all entries.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
      gap: 24,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingBottom: 8,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.border,
    },
    headerInfo: {
      flex: 1,
      gap: 4,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nameEditRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    displayName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    nameInput: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nameButton: {
      padding: 8,
    },
    email: {
      fontSize: 14,
      color: colors.textMuted,
    },
    section: {
      gap: 2,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowLabel: {
      fontSize: 16,
      color: colors.text,
    },
    deleteLabel: {
      color: "#8f3a3a",
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
    colorDots: {
      flexDirection: "row",
      gap: 10,
    },
    colorDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "transparent",
    },
    colorDotSelected: {
      borderWidth: 3,
    },
    unitChips: {
      flexDirection: "row",
      gap: 6,
    },
    unitChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitChipSelected: {
      borderColor: "transparent",
    },
    unitChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    unitChipTextSelected: {},
    footnote: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
    },
  });
