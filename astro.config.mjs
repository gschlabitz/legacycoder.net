// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightBlog from "starlight-blog";
import starlightThemeChameleon from "starlight-theme-chameleon";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://legacycoder.net",
  integrations: [
    starlight({
      title: "Guido Schlabitz",
      customCss: ["./src/styles/pfeffer.css", "./src/styles/bio.css"],
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/gschlabitz" },
        { icon: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/guido-schlabitz/" },
        { icon: "email", label: "Email", href: "mailto:hello@legacycoder.net" },
      ],
      components: {
        // Renders starlight-blog's header link plus our own Links link.
        SiteTitle: "./src/components/SiteTitle.astro",
        // Stock hero plus the CRT typing backdrop behind the whole page.
        Hero: "./src/components/Hero.astro",
      },
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        de: { label: "Deutsch", lang: "de" },
      },
      plugins: [
        starlightBlog({
          title: { en: "Blog", de: "Blog" },
          navigation: "header-start",
          authors: {
            guido: {
              name: "Guido Schlabitz",
            },
          },
        }),
        // After starlightBlog so Chameleon sees the final component map (ADR 0003).
        starlightThemeChameleon(),
      ],
    }),
    react(),
  ],
});
