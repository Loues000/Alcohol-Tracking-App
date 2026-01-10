import { DrinkCategory, VolumeUnit } from "./types";

export const DRINK_CATEGORIES: Array<{
  key: DrinkCategory;
  label: string;
  sizes: number[];
}> = [
  { key: "beer", label: "Beer", sizes: [0.33, 0.5] },
  { key: "wine", label: "Wine", sizes: [0.2, 0.75] },
  { key: "longdrink", label: "Long Drink", sizes: [0.25] },
  { key: "shot", label: "Shot", sizes: [0.02] },
];

export const CATEGORY_LABELS: Record<DrinkCategory, string> = {
  beer: "Beer",
  wine: "Wine",
  longdrink: "Long Drink",
  shot: "Shot",
};

export const SIZE_OPTIONS: Record<DrinkCategory, number[]> = DRINK_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.key] = category.sizes;
    return acc;
  },
  {} as Record<DrinkCategory, number[]>
);

export const formatSize = (sizeL: number, unit: VolumeUnit = "l") => {
  if (unit === "ml") {
    return `${Math.round(sizeL * 1000)} ml`;
  }

  const trimmed = sizeL.toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed} L`;
};
