import { DrinkCategory, VolumeUnit } from "./types";

export const DRINK_CATEGORIES: Array<{
  key: DrinkCategory;
  label: string;
  sizes: number[];
  defaultAbv: number | null;
}> = [
  { key: "beer", label: "Beer", sizes: [0.33, 0.5, 1.0], defaultAbv: 5 },
  { key: "wine", label: "Wine", sizes: [0.1, 0.2, 0.75], defaultAbv: 12 },
  { key: "sekt", label: "Sparkling Wine", sizes: [0.1, 0.2], defaultAbv: 11 },
  { key: "longdrink", label: "Long Drink", sizes: [0.2, 0.3], defaultAbv: 12 },
  { key: "shot", label: "Shot", sizes: [0.02, 0.04], defaultAbv: 35 },
  { key: "other", label: "Other", sizes: [0.1, 0.2, 0.3, 0.4, 0.5, 1.0], defaultAbv: null },
];

export const CATEGORY_LABELS: Record<DrinkCategory, string> = {
  beer: "Beer",
  wine: "Wine",
  sekt: "Sparkling Wine",
  longdrink: "Long Drink",
  shot: "Shot",
  other: "Other",
};

export const SIZE_OPTIONS: Record<DrinkCategory, number[]> = DRINK_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.key] = category.sizes;
    return acc;
  },
  {} as Record<DrinkCategory, number[]>
);

export const DEFAULT_ABV: Record<DrinkCategory, number | null> = DRINK_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.key] = category.defaultAbv;
    return acc;
  },
  {} as Record<DrinkCategory, number | null>
);

const OUNCES_PER_LITER = 33.814;

const formatNumber = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(/\.?0+$/, "");

export const formatSize = (sizeL: number, unit: VolumeUnit = "l") => {
  if (unit === "ml") {
    return `${Math.round(sizeL * 1000)} ml`;
  }

  if (unit === "cl") {
    return `${Math.round(sizeL * 100)} cl`;
  }

  if (unit === "oz") {
    return `${formatNumber(sizeL * OUNCES_PER_LITER, 1)} oz`;
  }

  return `${formatNumber(sizeL, 2)} L`;
};
