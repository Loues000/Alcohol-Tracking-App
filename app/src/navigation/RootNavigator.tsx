import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Tabs from "./Tabs";

export type RootStackParamList = {
  Tabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
