import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

/** Node-only deps of fengari (Lua VM), unused in the browser: stubbed to keep the bundle light. */
const empty = fileURLToPath(new URL("./src/macros/stubs/empty.js", import.meta.url));

/** Replacement for the one process variable fengari reads at load time. */
const FENGARI_DEFINE = { "process.env.FENGARICONF": "undefined" };

/** Vite config tuned for Tauri (fixed port, ignore src-tauri). */
export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  // fengari reads process.env.FENGARICONF unguarded at load time (luaconf.js): pin it (the rest: src/macros/envHide.ts).
  define: FENGARI_DEFINE,
  optimizeDeps: { rolldownOptions: { transform: { define: FENGARI_DEFINE } } },
  resolve: { alias: { tmp: empty, "readline-sync": empty } },
  // The lazily loaded macro chunk (Lua VM + CodeMirror) is ~555 kB; startup chunk stays small.
  build: { chunkSizeWarningLimit: 600 },
});
