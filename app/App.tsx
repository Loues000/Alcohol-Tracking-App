import { NavigationContainer } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { EntriesProvider } from "./src/lib/entries-context";
import { LocalSettingsProvider } from "./src/lib/local-settings";
import { ProfileProvider } from "./src/lib/profile-context";
import { supabase } from "./src/lib/supabase";
import { ThemeProvider } from "./src/lib/theme-context";
import Tabs from "./src/navigation/Tabs";
import LoginScreen from "./src/screens/LoginScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes("code=")) return;
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) Alert.alert("Sign in failed", error.message);
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
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
  );
}
