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
        order: resolve(__dirname, "order.html"),
        explore: resolve(__dirname, "explore.html"),
        logoVote: resolve(__dirname, "logo-vote.html"),
        // The hero intro with Coco instead of Kai: a saved demo (noindex), not linked from the site.
        cocoLab: resolve(__dirname, "coco-lab.html"),
      },
    },
  },
  test: { environment: "node" },
});
