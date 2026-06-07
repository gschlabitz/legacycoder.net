import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(dir, "index.html"),
        "design-system": resolve(dir, "design-system.html"),
      },
    },
  },
});
