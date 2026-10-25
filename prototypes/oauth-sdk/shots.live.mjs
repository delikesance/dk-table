/** Captures du moodboard en temps reel (1200x800, clair et sombre) sur `shots.live.fixture.test.ts`. Usage : node prototypes/oauth-sdk/shots.live.mjs <dossier> */
import { chromium } from "playwright";

const out = process.argv[2] ?? "docs/screenshots/boucle-temps-reel";
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, colorScheme: "light" });
await page.goto("http://127.0.0.1:4750/moodboard.html");
await page.waitForSelector("#live.up");
await page.screenshot({ path: `${out}/avant-clair.png` });
// declenche le run et mesure, dans la page, le delai entre l'evenement SSE et la carte deplacee
await page.evaluate(() => {
  window.__t = {};
  new MutationObserver(() => {
    const c = document.querySelector("#col-en-cours .card[data-id=graphe]");
    if (c && !window.__t.moved) window.__t.moved = performance.now();
  }).observe(document.body, { childList: true, subtree: true });
  window.__t.go = performance.now();
  fetch("/go", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
});
await page.waitForSelector("#col-termine .card[data-id=graphe]");
await page.waitForSelector("#col-en-cours .card[data-id=tri] .agent");
await page.waitForTimeout(800);
const t = await page.evaluate(() => window.__t);
console.log(`go -> carte « graphe » en colonne En cours : ${Math.round(t.moved - t.go)} ms (inclut le demarrage du run)`);
await page.screenshot({ path: `${out}/agents-paralleles-clair.png` });
await page.emulateMedia({ colorScheme: "dark" });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/agents-paralleles-sombre.png` });
await browser.close();
