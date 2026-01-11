import { ThemeMode } from "./theme";
import { DrinkCategory } from "./types";

export const CATEGORY_COLORS: Record<DrinkCategory, string> = {
  beer: "#c59b49",
  wine: "#9b3b46",
  sekt: "#d2b15a",
  longdrink: "#4f8ea8",
  shot: "#6f7a4f",
  other: "#8b7f7a",
};

const HEATMAP_ALPHA_STEPS: Record<ThemeMode, number[]> = {
  light: [0.18, 0.38, 0.62, 1],
  dark: [0.18, 0.43, 0.74, 1],
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const value = parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getHeatmapColors = (mode: ThemeMode, accent: string) =>
  HEATMAP_ALPHA_STEPS[mode].map((alpha) =>
    alpha === 1 ? accent : hexToRgba(accent, alpha)
  );

export const HEATMAP_OUT_OF_RANGE: Record<ThemeMode, string> = {
  light: "#f2efea",
  dark: "#1f1f1f",
};
