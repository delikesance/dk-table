/** Captures du moodboard avec anomalies (1200x800, clair et sombre) sur `shots.flux.fixture.test.ts`. Usage : node prototypes/oauth-sdk/shots.flux.mjs <dossier> */
import { chromium } from "playwright";

const out = process.argv[2] ?? "docs/screenshots/boucle-flux";
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, colorScheme: scheme });
  await page.goto("http://127.0.0.1:4748/moodboard.html");
  await page.waitForSelector(".card .anom");
  await page.screenshot({ path: `${out}/anomalies-${scheme === "light" ? "clair" : "sombre"}.png` });
  await page.close();
}
await browser.close();
