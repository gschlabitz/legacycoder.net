import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(dir, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(dir, "index.html"),
        "design-system": resolve(dir, "design-system.html"),
      },
    },
  },
});
