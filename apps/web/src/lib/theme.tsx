"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeId =
  | "studio"
  | "command"
  | "signal"
  | "midnight"
  | "ember"
  | "daybreak"
  | "ledger"
  | "coast"
  | "frost"
  | "atlas";

export type ThemeScheme = "dark" | "light";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  scheme: ThemeScheme;
  /** Accent swatch for the picker */
  swatch: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "studio",
    label: "Studio",
    description: "Cool graphite + blue — agent workspace",
    scheme: "dark",
    swatch: "#8aa4ff",
  },
  {
    id: "command",
    label: "Command",
    description: "Charcoal + amber — deal desk",
    scheme: "dark",
    swatch: "#d4a017",
  },
  {
    id: "signal",
    label: "Signal",
    description: "Ink + teal — ops console",
    scheme: "dark",
    swatch: "#2dd4bf",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep navy + cyan — night trading",
    scheme: "dark",
    swatch: "#38bdf8",
  },
  {
    id: "ember",
    label: "Ember",
    description: "Obsidian + coral — high-contrast CRM",
    scheme: "dark",
    swatch: "#fb7185",
  },
  {
    id: "daybreak",
    label: "Daybreak",
    description: "Clean white + steel blue — bright desk",
    scheme: "light",
    swatch: "#3b82f6",
  },
  {
    id: "ledger",
    label: "Ledger",
    description: "Cool gray + forest — underwriting",
    scheme: "light",
    swatch: "#059669",
  },
  {
    id: "coast",
    label: "Coast",
    description: "Soft white + ocean — field visits",
    scheme: "light",
    swatch: "#0284c7",
  },
  {
    id: "frost",
    label: "Frost",
    description: "Ice gray + cobalt — analysis",
    scheme: "light",
    swatch: "#2563eb",
  },
  {
    id: "atlas",
    label: "Atlas",
    description: "Bright white + charcoal — boardroom",
    scheme: "light",
    swatch: "#334155",
  },
];

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

export const STORAGE_KEY = "aurora_theme";
export const DEFAULT_THEME: ThemeId = "studio";

interface ThemeContextValue {
  theme: ThemeId;
  scheme: ThemeScheme;
  setTheme: (id: ThemeId) => void;
  themes: ThemeMeta[];
  darkThemes: ThemeMeta[];
  lightThemes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return Boolean(value && THEME_IDS.has(value));
}

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

function applyThemeToDocument(id: ThemeId) {
  const meta = getThemeMeta(id);
  document.documentElement.dataset.theme = id;
  document.documentElement.dataset.scheme = meta.scheme;
  document.documentElement.style.colorScheme = meta.scheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const next = isThemeId(stored) ? stored : DEFAULT_THEME;
    setThemeState(next);
    applyThemeToDocument(next);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyThemeToDocument(id);
  }, []);

  const darkThemes = useMemo(
    () => THEMES.filter((t) => t.scheme === "dark"),
    [],
  );
  const lightThemes = useMemo(
    () => THEMES.filter((t) => t.scheme === "light"),
    [],
  );

  const value = useMemo(
    () => ({
      theme,
      scheme: getThemeMeta(theme).scheme,
      setTheme,
      themes: THEMES,
      darkThemes,
      lightThemes,
    }),
    [theme, setTheme, darkThemes, lightThemes],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
