import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 相对路径：部署在 GitHub Pages 的 /<仓库名>/ 子路径下也能找到资源（路由使用 hash，不受影响）
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
          const norm = id.replace(/\\/g, "/");
          if (norm.includes("/games/physics/") || norm.includes("/games/math/")) {
            return "halls-phys-math";
          }
          if (
            norm.includes("/games/mechanics/") ||
            norm.includes("/games/architecture/") ||
            norm.includes("/games/computing/")
          ) {
            return "halls-mech-arch-comp";
          }
          if (norm.includes("/games/")) {
            return "halls-chem-bio-earth-astro";
          }
        }
      }
    }
  }
});
