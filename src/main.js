import "./styles.css";

const themeStorageKey = "theme";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

const links = [
  {
    label: "GitHub",
    href: "https://github.com/gschlabitz",
    detail: '"Experiments"',
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/guido-schlabitz/",
    detail: "Indispensible Industry Insights",
  },
  {
    label: "Email",
    href: "mailto:hello@legacycoder.net",
    detail: "Send me your spam.",
  },
];

const getStoredTheme = () => {
  const theme = localStorage.getItem(themeStorageKey);
  return theme === "dark" || theme === "light" ? theme : null;
};

const getActiveTheme = () => getStoredTheme() ?? (systemTheme.matches ? "dark" : "light");

const applyTheme = (theme) => {
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
  icon.innerHTML = theme === "dark" ? moonIcon : sunIcon;
};

const sunIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
`;

const moonIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M20 14.4A7.7 7.7 0 0 1 9.6 4a8.5 8.5 0 1 0 10.4 10.4Z" />
  </svg>
`;

applyTheme(getActiveTheme());

const app = document.querySelector("#app");
app.className = "page";
app.innerHTML = `
  <section class="profile" aria-labelledby="page-title">
    <header class="profile-header">
      <img class="avatar" src="/avatar.svg" alt="" width="96" height="96" />

      <button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false">
        <span id="theme-icon" class="theme-toggle__icon" aria-hidden="true"></span>
      </button>
    </header>

    <div class="intro">
      <h1 id="page-title" class="title">Legacy Coder</h1>
      <p class="bio">Coding my legacy to make the world a better place.</p>
    </div>

    <nav class="links" aria-label="Personal links">
      ${links
        .map(
          (link) => `
            <a class="link-card" href="${link.href}">
              <span class="link-card__label">${link.label}</span>
              <small class="link-card__detail">${link.detail}</small>
            </a>
          `,
        )
        .join("")}
    </nav>
  </section>
`;

applyTheme(getActiveTheme());

document.querySelector("#theme-toggle").addEventListener("click", () => {
  const nextTheme = getActiveTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
});

systemTheme.addEventListener("change", () => {
  if (!getStoredTheme()) {
    applyTheme(getActiveTheme());
  }
});
