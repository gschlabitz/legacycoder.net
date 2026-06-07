/*
 * Everybody lives under src, i.e. no public folder.
 * Assets are modules:
 *   - inline small assets
 *   - everything has a hash for cache busting
 *   - dependency graph yells when assets are missing
 */

import "./styles.css";
import { initTheme } from "./theme.js";
import avatarUrl from "./images/profile-portrait.jpg";
import faviconUrl from "./icons/favicon.svg";
import githubIcon from "./icons/GitHub_Invertocat_Black.svg?raw";
import briefcaseIcon from "./icons/briefcase.svg?raw";
import mailIcon from "./icons/mail.svg?raw";

const partials = import.meta.glob("./partials/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
});

const links = [
  { label: "GitHub", href: "https://github.com/gschlabitz", icon: githubIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/guido-schlabitz/", icon: briefcaseIcon },
  { label: "Email", href: "mailto:hello@legacycoder.net", icon: mailIcon },
];

const linkIcon = partials["./partials/link-icon.html"];
const appHtml = partials["./partials/app.html"].replace(
  "{{links}}",
  links
    .map((l) => linkIcon.replace("{{href}}", l.href).replace("{{label}}", l.label).replace("{{icon}}", l.icon))
    .join(""),
);

const app = document.querySelector("#app");
app.className = "page";
app.innerHTML = appHtml;

document.querySelector(".avatar").src = avatarUrl;

const link = document.createElement("link");
link.rel = "icon";
link.type = "image/svg+xml";
link.href = faviconUrl;
document.head.appendChild(link);

initTheme();
