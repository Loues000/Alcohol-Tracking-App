import { useEffect, useState } from "react";
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
import { DRINK_CATEGORIES, SIZE_OPTIONS } from "../lib/drinks";
import { useLocalSettings } from "../lib/local-settings";
import { useProfile } from "../lib/profile-context";
import { supabase } from "../lib/supabase";
import { DrinkCategory, VolumeUnit } from "../lib/types";

export default function AccountScreen() {
  const { profile, updateProfile, error } = useProfile();
  const { settings, updateSettings } = useLocalSettings();
  const [email, setEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localUnit, setLocalUnit] = useState<VolumeUnit>("l");
  const [localCategory, setLocalCategory] = useState<DrinkCategory>("beer");
  const [localSize, setLocalSize] = useState<number>(SIZE_OPTIONS.beer[0]);
  const [savingLocal, setSavingLocal] = useState(false);

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
        <Text style={styles.title}>Account</Text>

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
              style={styles.input}
            />
          </View>
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences (local)</Text>
          <View style={styles.section}>
            <Text style={styles.label}>Units</Text>
            <View style={styles.chipRow}>
              {(["l", "ml"] as VolumeUnit[]).map((value) => {
                const selected = localUnit === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setLocalUnit(value)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {value.toUpperCase()}
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
                      {localUnit === "ml" ? `${Math.round(size * 1000)} ml` : `${size} L`}
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
            <Text style={styles.saveText}>{savingLocal ? "Saving..." : "Save local settings"}</Text>
          </Pressable>
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4ef",
  },
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece6e1",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2b2724",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    color: "#6a645d",
  },
  infoValue: {
    color: "#2b2724",
    fontWeight: "600",
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f1c1a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6d1cc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
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
    borderColor: "#d6d1cc",
    backgroundColor: "#f6f4f1",
  },
  chipSelected: {
    backgroundColor: "#2b2b2b",
    borderColor: "#2b2b2b",
  },
  chipText: {
    fontSize: 13,
    color: "#2b2b2b",
  },
  chipTextSelected: {
    color: "#f8f5f1",
  },
  saveButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#1c6b4f",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: "#f5f3ee",
    fontWeight: "600",
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#ece7e2",
  },
  actionText: {
    fontWeight: "600",
    color: "#3b3530",
  },
  deleteButton: {
    backgroundColor: "#f0dede",
  },
  deleteText: {
    color: "#8f3a3a",
  },
});
