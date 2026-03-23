import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "src",
  plugins: [
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
  ],
  build: {
    target: "es2022",
    outDir: "../dist",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
  },
});
