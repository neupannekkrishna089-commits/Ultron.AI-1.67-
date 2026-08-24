import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: {
      "~": path.resolve(dirname, "./src"),
    },
  },
  // Tauri expects a fixed, predictable dev server port.
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Don't rebuild the frontend because the Rust backend recompiled.
      ignored: ["**/src-tauri/**"],
    },
  },
  // Tauri's bundler needs the client build under dist/ (not dist/client) —
  // this app no longer ships a server bundle at all.
  build: {
    outDir: "dist",
    // Celeron-class CPUs benefit from esbuild's minifier (fast, cheap) over
    // terser; esbuild is Vite's default, kept explicit for clarity.
    minify: "esbuild",
    target: "es2022",
  },
  envPrefix: ["VITE_", "TAURI_"],
});
