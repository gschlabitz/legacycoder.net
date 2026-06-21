import { useTheme } from "./hooks/useTheme";
import LinkIcon from "./components/LinkIcon";
import avatarUrl from "./images/profile-portrait.jpg";
import githubIcon from "./icons/GitHub_Invertocat_Black.svg?raw";
import briefcaseIcon from "./icons/briefcase.svg?raw";
import mailIcon from "./icons/mail.svg?raw";

const links = [
  { label: "GitHub", href: "https://github.com/gschlabitz", icon: githubIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/guido-schlabitz/", icon: briefcaseIcon },
  { label: "Email", href: "mailto:hello@legacycoder.net", icon: mailIcon },
];

export default function App() {
  const { theme, toggleTheme, icon: themeIcon, label: themeLabel } = useTheme();

  return (
    <main className="page">
      <section className="profile" aria-labelledby="page-title">
        <header className="profile-header">
          <img className="avatar" alt="" width="96" height="96" src={avatarUrl} />
          <div className="toolbar">
            {links.map((l) => (
              <LinkIcon key={l.label} href={l.href} label={l.label} icon={l.icon} />
            ))}
            <button
              id="theme-toggle"
              className="theme-toggle"
              type="button"
              aria-pressed={theme === "dark" ? "true" : "false"}
              aria-label={themeLabel}
              onClick={toggleTheme}
            >
              <span id="theme-icon" className="theme-toggle__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: themeIcon }} />
            </button>
          </div>
        </header>

        <div className="intro">
          <p className="eyebrow">Guido Schlabitz</p>
          <h1 id="page-title" className="title">Legacy Coder</h1>
          <p className="bio">Coding my legacy to make the world a better place.</p>
        </div>
      </section>
    </main>
  );
}
