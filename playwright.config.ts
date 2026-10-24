import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 1421); // not 1420: avoids reusing a developer's `tauri dev` server

/** E2E config: Chrome headless against the Vite front (no Tauri). Set E2E_CHANNEL=chrome to use system Chrome. */
export default defineConfig({
  testDir: "e2e",
  retries: 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, headless: true },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined },
    },
  ],
});
