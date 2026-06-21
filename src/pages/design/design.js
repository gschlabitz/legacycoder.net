import "@/styles.css";
import "@/style/pages/design.css";
import { getActiveTheme, applyTheme, getStoredTheme, systemTheme } from "@/theme.js";
import sunIcon from "@/icons/sun.svg?raw";
import moonIcon from "@/icons/moon.svg?raw";
import briefcaseIcon from "@/icons/briefcase.svg?raw";
import mailIcon from "@/icons/mail.svg?raw";

const colors = [
  { var: "--primary-blue-100", value: "oklch(95.1% 0.025 236.8)" },
  { var: "--primary-blue-300", value: "oklch(80.9% 0.096 251.8)" },
  { var: "--primary-blue-500", value: "oklch(68.5% 0.148 237.3)" },
  { var: "--primary-blue-900", value: "oklch(39.1% 0.085 240.9)" },
  { var: "--color-accent", value: "oklch(64.5% 0.215 16.4)" },
  { var: "--color-neutral-50", value: "oklch(98.5% 0.002 247.8) / oklch(0% 0 none)" },
  { var: "--color-neutral-100", value: "oklch(96.7% 0.003 264.5)" },
  { var: "--color-neutral-900", value: "oklch(21% 0.032 264.7)" },
  { var: "--color-text", value: "oklch(21% 0.032 264.7) / oklch(98.5% 0.002 247.8)" },
  { var: "--color-text-muted", value: "oklch(44.2% 0.015 285.8) / oklch(86.9% 0.004 56.4)" },
];

function renderSwatches(arr) {
  const theme = getActiveTheme();
  return arr.map((c) => {
    const hasBoth = c.value.includes(" / ");
    const [light, dark] = hasBoth ? c.value.split(" / ") : [c.value, null];
    const initial = dark ? (theme === "dark" ? dark : light) : light;
    return `
      <div class="ds-swatch">
        <div class="ds-swatch__preview" style="background: var(${c.var})"></div>
        <div class="ds-swatch__info">
          <div class="ds-swatch__name">${c.var}</div>
          <div class="ds-swatch__value ds-swatch__computed"
            ${dark ? `data-light="${light}" data-dark="${dark}"` : ""}>${initial}</div>
        </div>
      </div>
    `;
  }).join("");
}

function updateSwatchValues() {
  const theme = getActiveTheme();
  document.querySelectorAll(".ds-swatch__computed").forEach((el) => {
    if (el.dataset.dark) {
      el.textContent = theme === "dark" ? el.dataset.dark : el.dataset.light;
    }
  });
}

function render() {
  const themeToggleHtml = `
    <button class="theme-toggle" type="button" aria-pressed="false">
      <span class="theme-toggle__icon" aria-hidden="true">${sunIcon}</span>
    </button>
  `;

  const app = document.querySelector("#app");
  app.innerHTML = `
    <div class="ds">
      <header class="ds-header">
        <h1 class="ds-header__title">Design System</h1>
        <a class="ds-header__link" href="/">Back to site</a>
      </header>

      <section class="ds-section">
        <h2 class="ds-section__title">Colors</h2>
        <p class="ds-description">
          Perceptually-uniform OKLCH color space.
          Values update dynamically with theme.
        </p>
        <div class="ds-color-columns">
          <div class="ds-color-group">
            <h3 class="ds-color-group__title">Primary</h3>
            <div class="ds-grid">
              ${renderSwatches(colors.filter(c => c.var.includes("-primary-")))}</div>
          </div>
          <div class="ds-color-group">
            <h3 class="ds-color-group__title">Neutrals</h3>
            <div class="ds-grid">
              ${renderSwatches(colors.filter(c => c.var.includes("-neutral-")))}</div>
          </div>
          <div class="ds-color-group">
            <h3 class="ds-color-group__title">Others</h3>
            <div class="ds-grid">
              ${renderSwatches(colors.filter(c => !c.var.includes("-primary-") && !c.var.includes("-neutral-")))}</div>
          </div>
        </div>
      </section>

      <section class="ds-section">
        <h2 class="ds-section__title">Typography</h2>
        <p class="ds-description">Title: <code>IBM Plex Serif 900</code> &middot; Body: <code>Figtree, system-ui, sans-serif</code></p>
        <div class="ds-font-list">
          <div class="title" style="margin:0">Title — 3rem / 900</div>
          <div style="font-size:1rem;line-height:1.75;color:var(--color-text-muted)">Bio — 1rem / 400 / line-height 1.75</div>
          <div class="eyebrow" style="margin:0">Eyebrow — 0.75rem / 600 / uppercase</div>
        </div>
      </section>

      <section class="ds-section">
        <h2 class="ds-section__title">Spacing</h2>
        <p class="ds-description">Common spacing values used across components.</p>
        <div class="ds-space-scale">
          ${[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3].map((rem) => `
            <div class="ds-space-item">
              <div class="ds-space-item__bar" style="height:${rem}rem"></div>
              <span class="ds-space-item__label">${rem}rem</span>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="ds-section">
        <h2 class="ds-section__title">Components</h2>

        <p class="ds-description">Avatar — 5rem (6rem on &ge;640px), rounded 1rem</p>
        <div class="ds-component-row">
          <span class="ds-component-row__label">Avatar</span>
          <img class="avatar" alt="" width="96" height="96" style="background:var(--color-neutral-100)" />
        </div>

        <p class="ds-description" style="margin-top:1.5rem">Icon buttons — 2.5rem circular, blue glow on hover/focus</p>
        <div class="ds-component-row">
          <span class="ds-component-row__label">Icon buttons</span>
          <div class="toolbar">
            <a class="link-icon" href="#" aria-label="GitHub">${mailIcon}</a>
            <a class="link-icon" href="#" aria-label="LinkedIn">${briefcaseIcon}</a>
          </div>
        </div>

        <p class="ds-description" style="margin-top:1.5rem">Theme toggle</p>
        <div class="ds-component-row">
          <span class="ds-component-row__label">Theme toggle</span>
          ${themeToggleHtml}
        </div>

        <p class="ds-description" style="margin-top:1.5rem">Toolbar — flex row, 0.5rem gap</p>
        <div class="ds-component-row">
          <span class="ds-component-row__label">Toolbar</span>
          <div class="toolbar">
            <a class="link-icon" href="#" aria-label="GitHub">${mailIcon}</a>
            <a class="link-icon" href="#" aria-label="LinkedIn">${briefcaseIcon}</a>
            ${themeToggleHtml}
          </div>
        </div>
      </section>
    </div>
  `;

  const active = getActiveTheme();
  document.documentElement.classList.toggle("dark", active === "dark");
  document.documentElement.style.colorScheme = active;
  updateSwatchValues();

  const toggles = document.querySelectorAll(".theme-toggle");
  toggles.forEach((toggle) => {
    const icon = toggle.querySelector(".theme-toggle__icon");
    const next = active === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", `Switch to ${next} mode`);
    toggle.setAttribute("aria-pressed", String(active === "dark"));
    if (icon) {
      icon.innerHTML = active === "dark" ? moonIcon : sunIcon;
    }

    toggle.addEventListener("click", () => {
      const nextTheme = getActiveTheme() === "dark" ? "light" : "dark";
      localStorage.setItem("theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.style.colorScheme = nextTheme;
      updateSwatchValues();
      toggles.forEach((t) => {
        const i = t.querySelector(".theme-toggle__icon");
        const n = nextTheme === "dark" ? "light" : "dark";
        t.setAttribute("aria-label", `Switch to ${n} mode`);
        t.setAttribute("aria-pressed", String(nextTheme === "dark"));
        if (i) {
          i.innerHTML = nextTheme === "dark" ? moonIcon : sunIcon;
        }
      });
    });
  });

  systemTheme.addEventListener("change", () => {
    if (!getStoredTheme()) {
      applyTheme(getActiveTheme());
      updateSwatchValues();
    }
  });
}

render();
