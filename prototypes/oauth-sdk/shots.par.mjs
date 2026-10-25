/** Captures du panneau avec agents en parallele (1200x800, clair et sombre) sur `shots.par.fixture.test.ts`. Usage : node prototypes/oauth-sdk/shots.par.mjs <dossier> */
import { chromium } from "playwright";

const out = process.argv[2] ?? "docs/screenshots/boucle-parallele";
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, colorScheme: scheme });
  await page.goto("http://127.0.0.1:4749/");
  await page.click("#run");
  await page.waitForSelector(".par li.agent.ok");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/agents-paralleles-${scheme === "light" ? "clair" : "sombre"}.png` });
  await page.close();
}
await browser.close();
