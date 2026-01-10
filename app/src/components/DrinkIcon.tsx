import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { DrinkCategory } from "../lib/types";

type DrinkIconProps = {
  category: DrinkCategory;
  size?: number;
  color?: string;
};

const ICONS: Record<DrinkCategory, { family: "ion" | "fa5"; name: string }> = {
  shot: { family: "fa5", name: "glass-whiskey" },
  beer: { family: "ion", name: "beer" },
  wine: { family: "fa5", name: "wine-glass-alt" },
  longdrink: { family: "fa5", name: "cocktail" },
};

export default function DrinkIcon({ category, size = 16, color = "#2b2724" }: DrinkIconProps) {
  const icon = ICONS[category];

  if (icon.family === "ion") {
    return <Ionicons name={icon.name as never} size={size} color={color} />;
  }

  return <FontAwesome5 name={icon.name as never} size={size} color={color} solid />;
}
