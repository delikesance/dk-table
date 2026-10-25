import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

/** Node-only deps of fengari (Lua VM), unused in the browser: stubbed to keep the bundle light. */
const empty = fileURLToPath(new URL("./src/macros/stubs/empty.js", import.meta.url));

const readlineStub = fileURLToPath(new URL("./src/macros/stubs/readline.js", import.meta.url));
const osStub = fileURLToPath(new URL("./src/macros/stubs/os.js", import.meta.url));

/**
 * Process variables fengari reads at load time. The dev optimizer can hoist a bundler helper into fengari's chunk,
 * so fengari may be evaluated by any dep chunk (e.g. the document editor's CSS language) without `envHide`: it
 * must then load harmlessly under Vite's fake `process`.
 */
const FENGARI_DEFINE = { "process.env.FENGARICONF": "undefined", "process.versions.node": '"20.0.0"', global: "globalThis" };

/** Vite config tuned for Tauri (fixed port, ignore src-tauri). */
export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  // fengari reads process.env.FENGARICONF unguarded at load time (luaconf.js): pin it (the rest: src/macros/envHide.ts).
  define: FENGARI_DEFINE,
  optimizeDeps: { rolldownOptions: { transform: { define: FENGARI_DEFINE } } },
  resolve: { alias: { tmp: empty, "readline-sync": readlineStub, os: osStub } },
  // The lazily loaded macro chunk (Lua VM + CodeMirror) is ~555 kB; startup chunk stays small.
  build: { chunkSizeWarningLimit: 600 },
});
