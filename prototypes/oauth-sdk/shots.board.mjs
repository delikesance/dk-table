/**
 * Captures du moodboard et de la toile design (1200x800, clair et sombre) sur le serveur de demonstration
 * `shots.board.fixture.test.ts` (127.0.0.1:4747). Usage : [CHROMIUM=...] node prototypes/oauth-sdk/shots.board.mjs <dossier>
 */
import { chromium } from "playwright";

const out = process.argv[2] ?? "docs/screenshots/boucle-board";
const base = "http://127.0.0.1:4747";
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const scheme of ["light", "dark"]) {
  const tag = scheme === "light" ? "clair" : "sombre";
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, colorScheme: scheme });
  await page.goto(base + "/moodboard.html");
  await page.waitForSelector(".card");
  await page.screenshot({ path: `${out}/moodboard-${tag}.png` });
  await page.click(".card[data-id=recherchex]");
  await page.waitForSelector("#drawer img");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/moodboard-rapport-${tag}.png` });
  await page.goto(base + "/design.html");
  await page.waitForSelector("#viewer iframe");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/design-toile-${tag}.png` });
  await page.click(".thumb:has-text('120000')");
  await page.click("#errors-box summary");
  await page.waitForFunction(() => document.getElementById("err-count").textContent !== "0");
  await page.screenshot({ path: `${out}/design-erreurs-${tag}.png` });
  await page.click(".thumb:has-text('100000')");
  await page.click('[data-vp="390"]');
  await page.click('[data-theme-set="dark"]');
  await page.click("#compare");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/design-mobile-comparaison-${tag}.png` });
  await page.close();
}
await browser.close();
