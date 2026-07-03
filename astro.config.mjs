// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeGalaxy from "starlight-theme-galaxy";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Guido Schlabitz",
      // Place the reading-mode toggle just left of the dark/light toggle via a
      // ThemeSelect override (which re-renders the galaxy theme's own version).
      components: {
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      customCss: [
        "./src/styles/reading-mode.css",
        "./src/styles/pfeffer.css",
        "./src/styles/bio.css",
      ],
      // No-flash restore: re-apply the user's reading-mode choice before paint by
      // removing the attributes Starlight set server-side.
      head: [
        {
          tag: "script",
          content:
            "try{if(localStorage.getItem('lc:reading-mode')==='1'){" +
            "var d=document.documentElement;d.setAttribute('data-reading-mode','');" +
            "d.removeAttribute('data-has-sidebar');d.removeAttribute('data-has-toc');}}catch(e){}",
        },
      ],
      plugins: [starlightThemeGalaxy()],
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/gschlabitz" },
        { icon: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/guido-schlabitz/" },
        { icon: "email", label: "Email", href: "mailto:hello@legacycoder.net" },
      ],
    }),
    react(),
  ],
});
