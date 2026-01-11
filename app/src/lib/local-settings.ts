import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { DrinkCategory, VolumeUnit } from "./types";
import { SIZE_OPTIONS } from "./drinks";
import { ThemeAccent, ThemeMode } from "./theme";

export type LocalSettings = {
  unit: VolumeUnit;
  defaultCategory: DrinkCategory;
  defaultSizeL: number;
  themeMode: ThemeMode;
  themeAccent: ThemeAccent;
};

const SETTINGS_KEY = "local_settings_v1";

const DEFAULT_SETTINGS: LocalSettings = {
  unit: "l",
  defaultCategory: "beer",
  defaultSizeL: 0.33,
  themeMode: "light",
  themeAccent: "beer",
};

const THEME_MODES: ThemeMode[] = ["light", "dark"];
const THEME_ACCENTS: ThemeAccent[] = ["beer", "wine", "vodka", "caipirinha"];
const VOLUME_UNITS: VolumeUnit[] = ["l", "ml", "cl", "oz"];

const normalizeSettings = (value: Partial<LocalSettings> | null): LocalSettings => {
  if (!value) return DEFAULT_SETTINGS;
  const unit = VOLUME_UNITS.includes(value.unit ?? DEFAULT_SETTINGS.unit)
    ? (value.unit as VolumeUnit)
    : DEFAULT_SETTINGS.unit;
  const candidateCategory = value.defaultCategory ?? DEFAULT_SETTINGS.defaultCategory;
  const defaultCategory = Object.prototype.hasOwnProperty.call(SIZE_OPTIONS, candidateCategory)
    ? candidateCategory
    : DEFAULT_SETTINGS.defaultCategory;
  const sizeOptions = SIZE_OPTIONS[defaultCategory];
  const defaultSizeL =
    value.defaultSizeL && sizeOptions.includes(value.defaultSizeL)
      ? value.defaultSizeL
      : sizeOptions[0];
  const themeMode = THEME_MODES.includes(value.themeMode ?? DEFAULT_SETTINGS.themeMode)
    ? (value.themeMode as ThemeMode)
    : DEFAULT_SETTINGS.themeMode;
  const themeAccent = THEME_ACCENTS.includes(value.themeAccent ?? DEFAULT_SETTINGS.themeAccent)
    ? (value.themeAccent as ThemeAccent)
    : DEFAULT_SETTINGS.themeAccent;
  return { unit, defaultCategory, defaultSizeL, themeMode, themeAccent };
};

export const loadLocalSettings = async () => {
  const stored = await SecureStore.getItemAsync(SETTINGS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(stored) as Partial<LocalSettings>;
    return normalizeSettings(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveLocalSettings = async (settings: LocalSettings) => {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
};

type LocalSettingsContextValue = {
  settings: LocalSettings;
  loading: boolean;
  updateSettings: (updates: Partial<LocalSettings>) => Promise<void>;
};

const LocalSettingsContext = createContext<LocalSettingsContextValue | null>(null);

export function LocalSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocalSettings()
      .then((next) => setSettings(next))
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = async (updates: Partial<LocalSettings>) => {
    setSettings((prev) => {
      const next = normalizeSettings({ ...prev, ...updates });
      saveLocalSettings(next);
      return next;
    });
  };

  return React.createElement(
    LocalSettingsContext.Provider,
    { value: { settings, loading, updateSettings } },
    children
  );
}

export function useLocalSettings() {
  const ctx = useContext(LocalSettingsContext);
  if (!ctx) {
    throw new Error("useLocalSettings must be used within LocalSettingsProvider");
  }
  return ctx;
}
