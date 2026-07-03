// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightBlog from "starlight-blog";
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
      plugins: [
        starlightBlog({
          authors: {
            guido: {
              name: "Guido Schlabitz",
            },
          },
        }),
      ],
    }),
    react(),
  ],
});
