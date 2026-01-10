import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { DrinkCategory, VolumeUnit } from "./types";
import { SIZE_OPTIONS } from "./drinks";

export type LocalSettings = {
  unit: VolumeUnit;
  defaultCategory: DrinkCategory;
  defaultSizeL: number;
};

const SETTINGS_KEY = "local_settings_v1";

const DEFAULT_SETTINGS: LocalSettings = {
  unit: "l",
  defaultCategory: "beer",
  defaultSizeL: 0.33,
};

const normalizeSettings = (value: Partial<LocalSettings> | null): LocalSettings => {
  if (!value) return DEFAULT_SETTINGS;
  const unit = value.unit === "ml" ? "ml" : "l";
  const candidateCategory = value.defaultCategory ?? DEFAULT_SETTINGS.defaultCategory;
  const defaultCategory = Object.prototype.hasOwnProperty.call(SIZE_OPTIONS, candidateCategory)
    ? candidateCategory
    : DEFAULT_SETTINGS.defaultCategory;
  const sizeOptions = SIZE_OPTIONS[defaultCategory];
  const defaultSizeL =
    value.defaultSizeL && sizeOptions.includes(value.defaultSizeL)
      ? value.defaultSizeL
      : sizeOptions[0];
  return { unit, defaultCategory, defaultSizeL };
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

export function useLocalSettings() {
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

  return { settings, loading, updateSettings };
}
