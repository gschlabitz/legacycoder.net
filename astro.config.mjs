// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [starlight({
    title: "Guido Schlabitz",
    social: [
      { icon: "link", label: "Links", href: "/links/" },
      { icon: "seti:cake_php", label: "Recipes", href: "/recipes/" },
      { icon: "github", label: "GitHub", href: "https://github.com/gschlabitz" },
      { icon: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/guido-schlabitz/" },
      { icon: "email", label: "Email", href: "mailto:hello@legacycoder.net" },
    ],
    // sidebar: [
    //   {
    //     label: "Links",
    //     items: [
    //       // Each item here is one entry in the navigation menu.
    //       { label: "Links", slug: "links" },
    //     ],
    //   },
    //   {
    //     label: "Recipes",
    //     slug: "recipes",
    //   },
    // ],
  }), react()],
});