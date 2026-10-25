/**
 * Captures du journal avec un run simule realiste (sortie ANSI, doublons).
 * Usage : [CHROMIUM=...] node prototypes/oauth-sdk/shots.journal.mjs <dossier-de-sortie> <prefixe> [dossier-du-panneau]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const [out, prefix, dir = here] = process.argv.slice(2);
const E = String.fromCharCode(27);
const red = `npm test failed: FAIL  src/x.test.ts > cas > rouge\nAssertionError: attendu 1\n Tests  1 failed | 1833 passed | 1 skipped (1835)`;
const raw = `${E}[2m | ${E}[22m${E}[1m${E}[32m1833 passed${E}[39m${E}[2m | ${E}[22m${E}[33m1 skipped${E}[39m${E}[90m (1835)${E}[39m`;
const axes = ["nouveau", "absent", "neglige", "mal"];
const old = process.env.OLD === "1";
const events = [
  { type: "start", sector: "research" },
  ...axes.flatMap((a) => [{ type: "start", sector: "research", axis: a }, ...(old ? [{ type: "info", sector: "research", message: `[${a}] debut (plafond $5.40)` }] : [])]),
  ...axes.map((a, i) => ({ type: "end", sector: "research", axis: a, totalUsd: 0.45 + i * 0.5, remainingUsd: old ? 4.95 + i * 4.9 : 21.15 - i * 0.5,
    ...(old ? {} : { costUsd: 0.45 + i * 0.05, elapsedS: 45 + i * 6 }) })),
  { type: "info", sector: "research", message: `non fusionne (${old ? raw : red})` },
  { type: "end", sector: "research", ok: false, costUsd: 2.09, elapsedS: 155, totalUsd: 2.09 },
  { type: "summary", phase: "research", message: old ? "Échec : recherche. Dépensé 4,57 $ sur 21,60 $ (reste 17,03 $)." : "Échec : recherche. Dépensé 1,93 € sur 20,00 € (reste 18,07 €)." },
  ...(old ? [{ type: "info", sector: "research", message: "resume: Échec : recherche. Dépensé 4,57 $ sur 21,60 $ (reste 17,03 $)." }] : []),
  { type: "start", sector: "design" },
];
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, colorScheme: scheme });
  await page.route("**/*", (r) => {
    const p = new URL(r.request().url()).pathname;
    if (p.startsWith("/fonts/")) return r.fulfill({ body: readFileSync(join(here, p)), contentType: "font/woff2" });
    if (p.startsWith("/theme/")) return r.fulfill({ body: readFileSync(join(here, "../../src/styles", p.slice(7))), contentType: "text/css" });
    const f = { "/": "panel.html", "/panel.css": "panel.css", "/panel.js": "panel.js", "/fonts.css": "fonts.css", "/theme.js": "theme.js" }[p];
    return f ? r.fulfill({ body: readFileSync(join(dir, f)), contentType: f.endsWith("css") ? "text/css" : f.endsWith("js") ? "text/javascript" : "text/html" }) : r.fulfill({ status: 404 });
  });
  await page.addInitScript((evs) => {
    window.EventSource = class { set onmessage(f) { setTimeout(() => evs.forEach((e) => f({ data: JSON.stringify(e) })), 0); } };
  }, events);
  await page.goto("http://localhost/");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("log")?.scrollIntoView());
  await page.screenshot({ path: join(out, `${prefix}-journal-${scheme === "light" ? "clair" : "sombre"}.png`) });
  await page.close();
}
await browser.close();
