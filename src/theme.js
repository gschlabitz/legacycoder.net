import sunIcon from "./icons/sun.svg?raw";
import moonIcon from "./icons/moon.svg?raw";

const STORAGE_KEY = "theme";
export const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

export function getStoredTheme() {
  const theme = localStorage.getItem(STORAGE_KEY);
  return theme === "dark" || theme === "light" ? theme : null;
}

export function getActiveTheme() {
  return getStoredTheme() ?? (systemTheme.matches ? "dark" : "light");
}

export function initTheme() {
  const theme = getActiveTheme();
  document.documentElement.style.colorScheme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");

  const toggle = document.querySelector("#theme-toggle");
  if (toggle) {
    applyTheme(theme);

    toggle.addEventListener("click", () => {
      const nextTheme = getActiveTheme() === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, nextTheme);
      applyTheme(nextTheme);
    });
  }

  systemTheme.addEventListener("change", () => {
    if (!getStoredTheme()) {
      applyTheme(getActiveTheme());
    }
  });
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;

  const toggle = document.querySelector("#theme-toggle");
  const icon = document.querySelector("#theme-icon");

  if (!toggle || !icon) {
    return;
  }

  const nextTheme = theme === "dark" ? "light" : "dark";
  toggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
  toggle.setAttribute("aria-pressed", String(theme === "dark"));
  icon.innerHTML = theme === "dark" ? sunIcon : moonIcon;
}
