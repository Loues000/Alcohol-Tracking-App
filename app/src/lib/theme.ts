export type ThemeMode = "light" | "dark";
export type ThemeAccent = "beer" | "wine" | "vodka" | "caipirinha";

export type Theme = {
  mode: ThemeMode;
  accent: ThemeAccent;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    surfaceMuted: string;
    text: string;
    textMuted: string;
    border: string;
    borderStrong: string;
    accent: string;
    accentSoft: string;
    accentMuted: string;
    accentText: string;
    shadow: string;
  };
};

export const ACCENT_COLORS: Record<ThemeAccent, string> = {
  beer: "#e59d2c",
  wine: "#93032e",
  vodka: "#77b5d3",
  caipirinha: "#CBDCA6",
};

const BASE_COLORS: Record<ThemeMode, Omit<Theme["colors"], "accent" | "accentSoft" | "accentMuted" | "accentText">> =
  {
    light: {
      background: "#EEE2df",
      surface: "#ffffff",
      surfaceAlt: "#fffdf9",
      surfaceMuted: "#f7f1ea",
      text: "#1f1c1a",
      textMuted: "#6a645d",
      border: "#e3d8cf",
      borderStrong: "#d6c9bf",
      shadow: "#000000",
    },
    dark: {
      background: "#151515",
      surface: "#1f1f1f",
      surfaceAlt: "#1b1b1b",
      surfaceMuted: "#242424",
      text: "#f4f2ef",
      textMuted: "#b1aaa2",
      border: "#2b2b2b",
      borderStrong: "#3a3a3a",
      shadow: "#000000",
    },
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

const getContrastText = (hex: string) => {
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
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#151515" : "#ffffff";
};

export const getTheme = (mode: ThemeMode, accent: ThemeAccent): Theme => {
  const base = BASE_COLORS[mode];
  const accentColor = ACCENT_COLORS[accent];
  const accentSoft = hexToRgba(accentColor, mode === "dark" ? 0.28 : 0.18);
  const accentMuted = hexToRgba(accentColor, mode === "dark" ? 0.4 : 0.26);
  const accentText = getContrastText(accentColor);

  return {
    mode,
    accent,
    colors: {
      ...base,
      accent: accentColor,
      accentSoft,
      accentMuted,
      accentText,
    },
  };
};
