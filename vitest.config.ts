import { defineConfig } from "vitest/config";

/** Vitest config: ignore agent worktree copies under `.claude/`. */
export default defineConfig({
  test: { exclude: ["node_modules/**", "dist/**", ".claude/**", "src-tauri/**"] },
});
