import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 相对路径：部署在 GitHub Pages 的 /<仓库名>/ 子路径下也能找到资源（路由使用 hash，不受影响）
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // 各实验经 games.ts 的 load() 动态导入，Rollup 会自动为每个实验切出独立代码块
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        }
      }
    }
  }
});
