import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { DRINK_CATEGORIES, SIZE_OPTIONS, formatSize } from "../lib/drinks";
import { useLocalSettings } from "../lib/local-settings";
import { useProfile } from "../lib/profile-context";
import { supabase } from "../lib/supabase";
import { DrinkCategory, VolumeUnit } from "../lib/types";
import { ACCENT_COLORS, ThemeAccent, ThemeMode } from "../lib/theme";
import type { Theme } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

const THEME_MODES: ThemeMode[] = ["light", "dark"];
const THEME_ACCENTS: Array<{ key: ThemeAccent; label: string; color: string }> = [
  { key: "beer", label: "Beer", color: ACCENT_COLORS.beer },
  { key: "wine", label: "Wine", color: ACCENT_COLORS.wine },
  { key: "vodka", label: "Vodka", color: ACCENT_COLORS.vodka },
  { key: "caipirinha", label: "Caipirinha", color: ACCENT_COLORS.caipirinha },
];

type SettingsTab = "account" | "preferences" | "theme" | "actions";

const SETTINGS_TABS: Array<{ key: SettingsTab; label: string }> = [
  { key: "account", label: "Account" },
  { key: "preferences", label: "Preferences" },
  { key: "theme", label: "Theme" },
  { key: "actions", label: "Actions" },
];

export default function AccountScreen() {
  const { profile, updateProfile, error } = useProfile();
  const { settings, updateSettings } = useLocalSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localUnit, setLocalUnit] = useState<VolumeUnit>("l");
  const [localCategory, setLocalCategory] = useState<DrinkCategory>("beer");
  const [localSize, setLocalSize] = useState<number>(SIZE_OPTIONS.beer[0]);
  const [localThemeMode, setLocalThemeMode] = useState<ThemeMode>("light");
  const [localThemeAccent, setLocalThemeAccent] = useState<ThemeAccent>("beer");
  const [savingLocal, setSavingLocal] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setProvider(data.user?.app_metadata?.provider ?? null);
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
  }, [profile]);

  useEffect(() => {
    setLocalUnit(settings.unit);
    setLocalCategory(settings.defaultCategory);
    setLocalSize(settings.defaultSizeL);
    setLocalThemeMode(settings.themeMode);
    setLocalThemeAccent(settings.themeAccent);
  }, [settings]);

  useEffect(() => {
    if (!SIZE_OPTIONS[localCategory].includes(localSize)) {
      setLocalSize(SIZE_OPTIONS[localCategory][0]);
    }
  }, [localCategory, localSize]);

  const handleSave = async () => {
    setSaving(true);
    const updated = await updateProfile({
      display_name: displayName.trim().length > 0 ? displayName.trim() : "",
    });
    setSaving(false);
    if (!updated) {
      Alert.alert("Save failed", error ?? "Please try again.");
    }
  };

  const handleSaveLocal = async () => {
    setSavingLocal(true);
    await updateSettings({
      unit: localUnit,
      defaultCategory: localCategory,
      defaultSizeL: localSize,
      themeMode: localThemeMode,
      themeAccent: localThemeAccent,
    });
    setSavingLocal(false);
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
        "Your entries were deleted, but the auth account could not be removed. Configure the delete_account function to fully remove users."
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.tabRow}>
          {SETTINGS_TABS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, selected && styles.tabActive]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "account" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email ?? "--"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Provider</Text>
              <Text style={styles.infoValue}>{provider ?? "--"}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save profile"}</Text>
            </Pressable>
          </View>
        ) : null}

        {activeTab === "preferences" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preferences</Text>
            <View style={styles.section}>
              <Text style={styles.label}>Units</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    { key: "l", label: "L" },
                    { key: "ml", label: "ml" },
                    { key: "cl", label: "cl" },
                    { key: "oz", label: "oz" },
                  ] as Array<{ key: VolumeUnit; label: string }>
                ).map((option) => {
                  const selected = localUnit === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setLocalUnit(option.key)}
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
              <Text style={styles.label}>Default drink</Text>
              <View style={styles.chipRow}>
                {DRINK_CATEGORIES.map((category) => {
                  const selected = localCategory === category.key;
                  return (
                    <Pressable
                      key={category.key}
                      onPress={() => setLocalCategory(category.key)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Default size</Text>
              <View style={styles.chipRow}>
                {SIZE_OPTIONS[localCategory].map((size) => {
                  const selected = localSize === size;
                  return (
                    <Pressable
                      key={`${localCategory}-${size}`}
                      onPress={() => setLocalSize(size)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {formatSize(size, localUnit)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable
              style={[styles.saveButton, savingLocal && styles.saveButtonDisabled]}
              onPress={handleSaveLocal}
              disabled={savingLocal}
            >
              <Text style={styles.saveText}>{savingLocal ? "Saving..." : "Save changes"}</Text>
            </Pressable>
          </View>
        ) : null}

        {activeTab === "theme" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Theme</Text>
            <View style={styles.section}>
              <Text style={styles.label}>Theme mode</Text>
              <View style={styles.chipRow}>
                {THEME_MODES.map((mode) => {
                  const selected = localThemeMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setLocalThemeMode(mode)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {mode === "light" ? "Light" : "Dark"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Accent theme</Text>
              <View style={styles.chipRow}>
                {THEME_ACCENTS.map((accent) => {
                  const selected = localThemeAccent === accent.key;
                  return (
                    <Pressable
                      key={accent.key}
                      onPress={() => setLocalThemeAccent(accent.key)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <View style={[styles.accentDot, { backgroundColor: accent.color }]} />
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {accent.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable
              style={[styles.saveButton, savingLocal && styles.saveButtonDisabled]}
              onPress={handleSaveLocal}
              disabled={savingLocal}
            >
              <Text style={styles.saveText}>{savingLocal ? "Saving..." : "Save changes"}</Text>
            </Pressable>
          </View>
        ) : null}

        {activeTab === "actions" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account actions</Text>
            <Pressable style={styles.actionButton} onPress={logout}>
              <Text style={styles.actionText}>Sign out</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.deleteButton, deleting && styles.saveButtonDisabled]}
              onPress={confirmDeleteAccount}
              disabled={deleting}
            >
              <Text style={[styles.actionText, styles.deleteText]}>
                {deleting ? "Deleting..." : "Delete account"}
              </Text>
            </Pressable>
          </View>
        ) : null}
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
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.accentText,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    color: colors.textMuted,
  },
  infoValue: {
    color: colors.text,
    fontWeight: "600",
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
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
    fontSize: 13,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.accentText,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 6,
  },
  saveButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.accentText,
    fontWeight: "600",
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
  },
  actionText: {
    fontWeight: "600",
    color: colors.text,
  },
  deleteButton: {
    backgroundColor: "#f0dede",
  },
  deleteText: {
    color: "#8f3a3a",
  },
});
