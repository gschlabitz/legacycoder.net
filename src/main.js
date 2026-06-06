import "./styles.css";

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

document.querySelector("#app").innerHTML = `
  <section class="profile" aria-labelledby="page-title">
    <img class="avatar" src="/avatar.svg" alt="" width="96" height="96" />
    <h1 id="page-title">Legacy Coder</h1>
    <p class="bio">Coding my legacy<br/>to make the world a better place.</p>

    <nav class="links" aria-label="Personal links">
      ${links
        .map(
          (link) => `
            <a class="link" href="${link.href}">
              <span>${link.label}</span>
              <small>${link.detail}</small>
            </a>
          `,
        )
        .join("")}
    </nav>
  </section>
`;
