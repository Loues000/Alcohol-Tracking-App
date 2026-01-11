import React, { createContext, useContext, useMemo } from "react";
import { getTheme, Theme } from "./theme";
import { useLocalSettings } from "./local-settings";

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useLocalSettings();
  const theme = useMemo(
    () => getTheme(settings.themeMode, settings.themeAccent),
    [settings.themeMode, settings.themeAccent]
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
