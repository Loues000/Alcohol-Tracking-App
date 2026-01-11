import { useState } from "react";
import { Alert, Linking, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";

const REDIRECT_TO = "alcoholtracking://auth-callback";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "apple" | "google">(null);
  const busy = loading || oauthLoading !== null;

  const signIn = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Missing info", "Enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (error) Alert.alert("Sign in failed", error.message);
    } catch (err) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Missing info", "Enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: trimmedEmail, password: trimmedPassword });
      if (error) {
        Alert.alert("Sign up failed", error.message);
      } else {
        Alert.alert("Check your email", "Confirm your email to finish sign up (if enabled).");
      }
    } catch (err) {
      Alert.alert("Sign up failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider: "apple" | "google") => {
    setOauthLoading(provider);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: REDIRECT_TO,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        Alert.alert("Sign in failed", error.message);
        return;
      }

      if (!data?.url) {
        Alert.alert("Sign in failed", "No redirect URL returned.");
        return;
      }

      const canOpen = await Linking.canOpenURL(data.url);
      if (!canOpen) {
        Alert.alert("Sign in failed", "Unable to open the login link.");
        return;
      }

      await Linking.openURL(data.url);
    } catch (err) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to keep your tracking private.</Text>

        <View style={styles.oauthGroup}>
          <Pressable
            style={[styles.oauthButton, styles.appleButton]}
            onPress={() => signInWithProvider("apple")}
            disabled={busy}
          >
            <Text style={styles.oauthText}>
              {oauthLoading === "apple" ? "Connecting..." : "Continue with Apple"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.oauthButton, styles.googleButton]}
            onPress={() => signInWithProvider("google")}
            disabled={busy}
          >
            <Text style={styles.oauthText}>
              {oauthLoading === "google" ? "Connecting..." : "Continue with Google"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <Pressable
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          onPress={signIn}
          disabled={busy}
        >
          <Text style={styles.primaryText}>{loading ? "Signing in..." : "Sign in"}</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, busy && styles.buttonDisabled]} onPress={signUp} disabled={busy}>
          <Text style={styles.secondaryText}>{loading ? "..." : "Create account"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4ef",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1f1c1a",
  },
  subtitle: {
    color: "#6a645d",
  },
  oauthGroup: {
    gap: 10,
    marginTop: 8,
  },
  oauthButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  appleButton: {
    backgroundColor: "#1f1c1a",
  },
  googleButton: {
    backgroundColor: "#d64c3b",
  },
  oauthText: {
    color: "#f8f5f1",
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#d6d1cc",
  },
  dividerText: {
    fontSize: 12,
    color: "#8a837b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6d1cc",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#1c6b4f",
  },
  primaryText: {
    color: "#f5f3ee",
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#ece7e2",
  },
  secondaryText: {
    color: "#3b3530",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
