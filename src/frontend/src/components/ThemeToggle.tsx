import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cs_theme";

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === "dark";
    return true;
  } catch {
    return true;
  }
}

interface ThemeToggleProps {
  /** Visual size of the button — defaults to "md" */
  size?: "sm" | "md";
  className?: string;
}

export function ThemeToggle({ size = "md", className = "" }: ThemeToggleProps) {
  const [dark, setDark] = useState<boolean>(getInitialDark);

  // Sync HTML class whenever dark changes (also on first render)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark((d) => !d);

  const iconSize = size === "sm" ? 14 : 16;
  const btnSize = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      data-ocid="theme.toggle"
      className={`${btnSize} rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 ${className}`}
    >
      {dark ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  );
}
