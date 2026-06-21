import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Pages live under src/pages; a page's path here is its URL.
  root: resolve(dir, "src/pages"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(dir, "src"),
    },
  },
  build: {
    // outDir is outside root, so emptyOutDir is required to clean it.
    outDir: resolve(dir, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(dir, "src/pages/index.html"),
        design: resolve(dir, "src/pages/design/index.html"),
        pfeffer: resolve(dir, "src/pages/pfeffer/index.html"),
      },
    },
  },
});
