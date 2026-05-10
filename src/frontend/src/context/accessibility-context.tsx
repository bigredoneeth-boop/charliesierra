import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ColorBlindMode =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";

export interface AccessibilityPreferences {
  fontSizeScale: number; // 1.0 – 2.0, step 0.25
  highContrast: boolean;
  reduceAnimations: boolean;
  colorBlindMode: ColorBlindMode;
}

interface AccessibilityContextValue extends AccessibilityPreferences {
  setFontSizeScale: (scale: number) => void;
  setHighContrast: (on: boolean) => void;
  setReduceAnimations: (on: boolean) => void;
  setColorBlindMode: (mode: ColorBlindMode) => void;
}

const STORAGE_KEY = "cs_a11y";

const DEFAULTS: AccessibilityPreferences = {
  fontSizeScale: 1.0,
  highContrast: false,
  reduceAnimations: false,
  colorBlindMode: "none",
};

function loadPrefs(): AccessibilityPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      fontSizeScale:
        typeof parsed.fontSizeScale === "number"
          ? Math.min(2.0, Math.max(1.0, parsed.fontSizeScale))
          : DEFAULTS.fontSizeScale,
      highContrast:
        typeof parsed.highContrast === "boolean"
          ? parsed.highContrast
          : DEFAULTS.highContrast,
      reduceAnimations:
        typeof parsed.reduceAnimations === "boolean"
          ? parsed.reduceAnimations
          : DEFAULTS.reduceAnimations,
      colorBlindMode: [
        "none",
        "protanopia",
        "deuteranopia",
        "tritanopia",
      ].includes(parsed.colorBlindMode as string)
        ? (parsed.colorBlindMode as ColorBlindMode)
        : DEFAULTS.colorBlindMode,
    };
  } catch {
    return DEFAULTS;
  }
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null,
);

export function AccessibilityProvider({
  children,
}: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(loadPrefs);
  const isFirstRun = useRef(true);

  // Persist to localStorage on every change (skip first synchronous init)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  // Apply font size scale to <html>
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-size-scale",
      String(prefs.fontSizeScale),
    );
  }, [prefs.fontSizeScale]);

  // Apply high-contrast data attribute
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-high-contrast",
      prefs.highContrast ? "true" : "false",
    );
  }, [prefs.highContrast]);

  // Apply reduce-motion class
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      prefs.reduceAnimations,
    );
  }, [prefs.reduceAnimations]);

  // Apply color-blind data attribute
  useEffect(() => {
    document.documentElement.dataset.colorBlind = prefs.colorBlindMode;
  }, [prefs.colorBlindMode]);

  const setFontSizeScale = useCallback((scale: number) => {
    setPrefs((p) => ({
      ...p,
      fontSizeScale: Math.min(2.0, Math.max(1.0, scale)),
    }));
  }, []);

  const setHighContrast = useCallback((on: boolean) => {
    setPrefs((p) => ({ ...p, highContrast: on }));
  }, []);

  const setReduceAnimations = useCallback((on: boolean) => {
    setPrefs((p) => ({ ...p, reduceAnimations: on }));
  }, []);

  const setColorBlindMode = useCallback((mode: ColorBlindMode) => {
    setPrefs((p) => ({ ...p, colorBlindMode: mode }));
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        ...prefs,
        setFontSizeScale,
        setHighContrast,
        setReduceAnimations,
        setColorBlindMode,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx)
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider",
    );
  return ctx;
}
