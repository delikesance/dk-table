import { defineConfig, devices } from "@playwright/test";

// Own Vite server per run on a random free-ish port (never 1420, never another worktree's server); E2E_PORT wins.
// Set in process.env so Playwright workers (which re-load this file) see the same port.
const PORT = Number(process.env.E2E_PORT || (process.env.E2E_PORT = String(20000 + Math.floor(Math.random() * 30000))));

/** E2E config: Chrome headless against the Vite front (no Tauri). Set E2E_CHANNEL=chrome to use system Chrome. */
export default defineConfig({
  testDir: "e2e",
  retries: 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, headless: true },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined },
    },
  ],
});
