import { useState, useEffect, useCallback } from "react";
import sunIcon from "../icons/sun.svg?raw";
import moonIcon from "../icons/moon.svg?raw";

const STORAGE_KEY = "theme";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function getStoredTheme() {
  const theme = localStorage.getItem(STORAGE_KEY);
  return theme === "dark" || theme === "light" ? theme : null;
}

function getActiveTheme() {
  return getStoredTheme() ?? (systemTheme.matches ? "dark" : "light");
}

export function useTheme() {
  const [theme, setTheme] = useState(getActiveTheme);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const handler = () => {
      if (!getStoredTheme()) {
        setTheme(getActiveTheme());
      }
    };
    systemTheme.addEventListener("change", handler);
    return () => systemTheme.removeEventListener("change", handler);
  }, []);

  const icon = theme === "dark" ? moonIcon : sunIcon;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} mode`;

  return { theme, toggleTheme, icon, label };
}
