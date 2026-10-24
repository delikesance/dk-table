import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

/** Node-only deps of fengari (Lua VM), unused in the browser: stubbed to keep the bundle light. */
const empty = fileURLToPath(new URL("./src/macros/stubs/empty.js", import.meta.url));

/** Vite config tuned for Tauri (fixed port, ignore src-tauri). */
export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  resolve: { alias: { tmp: empty, "readline-sync": empty } },
  // The lazily loaded macro chunk (Lua VM + CodeMirror) is ~555 kB; startup chunk stays small.
  build: { chunkSizeWarningLimit: 600 },
});
