import { defineConfig } from "vitest/config";

/** Vitest config: ignore agent worktree copies under `.claude/`; generous timeouts (a loaded Windows machine is 10x slower, a green test never waits for them). */
export default defineConfig({
  test: { testTimeout: 30_000, hookTimeout: 30_000, setupFiles: ["src/test-setup.ts"], exclude: ["node_modules/**", "e2e/**", "dist/**", ".claude/**", "src-tauri/**"] },
});
