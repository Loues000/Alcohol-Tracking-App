import { NavigationContainer } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from "react-native";
import { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { EntriesProvider } from "./src/lib/entries-context";
import { LocalSettingsProvider } from "./src/lib/local-settings";
import { ProfileProvider } from "./src/lib/profile-context";
import { supabase } from "./src/lib/supabase";
import { ThemeProvider } from "./src/lib/theme-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import Tabs from "./src/navigation/Tabs";
import LoginScreen from "./src/screens/LoginScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const hydrateSession = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setAuthError(error.message);
    }
    setSession(data.session);
    setLoading(false);
  }, []);

  useEffect(() => {
    hydrateSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "SIGNED_OUT") {
        setAuthError(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [hydrateSession]);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes("code=")) return;
      setLoading(true);
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) Alert.alert("Sign in failed", error.message);
      setLoading(false);
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <ActivityIndicator size="large" />
        <Text>Checking session…</Text>
      </View>
    );
  }

  if (authError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
        <Text style={{ fontWeight: "700", fontSize: 18 }}>Could not load your session</Text>
        <Text style={{ color: "#6a645d", textAlign: "center" }}>{authError}</Text>
        <Pressable
          style={{
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            backgroundColor: "#1c6b4f",
          }}
          onPress={hydrateSession}
        >
          <Text style={{ color: "#f5f3ee", fontWeight: "600" }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <LocalSettingsProvider>
            <ThemeProvider>
              {session ? (
                <ProfileProvider user={session.user}>
                  <EntriesProvider userId={session.user.id}>
                    <Tabs />
                  </EntriesProvider>
                </ProfileProvider>
              ) : (
                <LoginScreen />
              )}
            </ThemeProvider>
          </LocalSettingsProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
