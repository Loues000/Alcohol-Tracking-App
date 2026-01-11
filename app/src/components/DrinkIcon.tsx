import { ComponentProps } from "react";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { DrinkCategory } from "../lib/types";

type DrinkIconProps = {
  category: DrinkCategory;
  size?: number;
  color?: string;
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type FontAwesome5Name = ComponentProps<typeof FontAwesome5>["name"];

type IconDefinition =
  | { family: "ion"; name: IoniconName }
  | { family: "fa5"; name: FontAwesome5Name };

const ICONS: Record<DrinkCategory, IconDefinition> = {
  shot: { family: "fa5", name: "glass-whiskey" },
  beer: { family: "ion", name: "beer" },
  wine: { family: "fa5", name: "wine-glass-alt" },
  sekt: { family: "fa5", name: "glass-cheers" },
  longdrink: { family: "fa5", name: "cocktail" },
  other: { family: "fa5", name: "question-circle" },
};

export default function DrinkIcon({ category, size = 16, color = "#2b2724" }: DrinkIconProps) {
  const icon = ICONS[category];

  if (icon.family === "ion") {
    return <Ionicons name={icon.name} size={size} color={color} />;
  }

  return <FontAwesome5 name={icon.name} size={size} color={color} solid />;
}
