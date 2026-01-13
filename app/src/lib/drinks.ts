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
  { key: "other", label: "Other", sizes: [], defaultAbv: null },
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

export const OUNCES_PER_LITER = 33.814;

const formatNumber = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(/\.?0+$/, "");

const roundToStep = (value: number, step: number) => Math.round(value / step) * step;
const toFixedNumber = (value: number, decimals = 4) => Number(value.toFixed(decimals));

const normalizeOunceSizes = (sizesL: number[]) => {
  const roundedOz = sizesL.map((size) => roundToStep(size * OUNCES_PER_LITER, 0.5));
  const uniqueOz = Array.from(new Set(roundedOz.map((value) => value.toFixed(1))))
    .map((value) => Number(value))
    .sort((a, b) => a - b);
  return uniqueOz.map((oz) => toFixedNumber(oz / OUNCES_PER_LITER));
};

export const getSizeOptions = (category: DrinkCategory, unit: VolumeUnit) => {
  if (unit !== "oz") return SIZE_OPTIONS[category];
  if (category === "beer") {
    return [12, 16, 32].map((oz) => toFixedNumber(oz / OUNCES_PER_LITER));
  }
  return normalizeOunceSizes(SIZE_OPTIONS[category]);
};

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
