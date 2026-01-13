import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Tabs from "./Tabs";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import { useTheme } from "../lib/theme-context";

export type RootStackParamList = {
  Tabs: undefined;
  ProfileSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{ title: "Settings" }}
      />
    </Stack.Navigator>
  );
}
