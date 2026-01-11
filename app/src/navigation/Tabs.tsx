import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, FontAwesome, FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import DiagramsScreen from "../screens/DiagramsScreen";
import AddEntryScreen from "../screens/AddEntryScreen";
import DataScreen from "../screens/DataScreen";
import AccountScreen from "../screens/AccountScreen";
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
            case "Diagrams":
              return <FontAwesome name="line-chart" color={color} size={size} />;
            case "Add Entry":
              return <FontAwesome5 name="plus" color={color} size={size} />;
            case "Data":
              return <FontAwesome name="calendar" color={color} size={size} />;
            case "Account":
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
      <Tab.Screen name="Diagrams" component={DiagramsScreen} />
      <Tab.Screen name="Add Entry" component={AddEntryScreen} />
      <Tab.Screen name="Data" component={DataScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
