import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import AddEntryScreen from "../screens/AddEntryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useTheme } from "../lib/theme-context";

const Tab = createBottomTabNavigator();

export default function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case "Dashboard":
              return <FontAwesome6 name="house" color={color} size={size} />;
            case "Add Entry":
              return <FontAwesome5 name="plus" color={color} size={size} />;
            case "Profile":
              return <Feather name="user" color={color} size={size} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Add Entry" component={AddEntryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
