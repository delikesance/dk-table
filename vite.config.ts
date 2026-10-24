import { defineConfig } from "vite";

/** Vite config tuned for Tauri (fixed port, ignore src-tauri). */
export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
});
