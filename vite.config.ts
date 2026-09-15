import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Relative base so the site works from any host path (Cloudflare Pages preview URLs included).
export default defineConfig({
  base: "./",
  build: {
    assetsDir: "static", // keeps built JS/CSS apart from public/assets
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        privacy: resolve(__dirname, "privacy.html"),
        terms: resolve(__dirname, "terms.html"),
      },
    },
  },
  test: { environment: "node" },
});
