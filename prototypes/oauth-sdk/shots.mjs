/**
 * Captures du panneau Boucle (1200x800, clair puis sombre) avec des evenements SSE simules.
* Usage : [CHROMIUM=/chemin/chrome] node prototypes/oauth-sdk/shots.mjs <dossier-de-sortie> <prefixe>   (ex. docs/screenshots/boucle avant)
 * Pas de serveur: panel.html/css/js sont servis depuis le disque et EventSource est remplace.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const dir = dirname(fileURLToPath(import.meta.url));
const [out = "docs/screenshots/boucle", prefix = "boucle"] = process.argv.slice(2);
/** Scenario en cours: recherche presque finie, un agent en echec, erreur reseau. */
const RUNNING = [
  { type: "start", sector: "research" },
  ...["nouveau", "absent", "neglige", "mal"].map((axis) => ({ type: "start", sector: "research", axis })),
  { type: "end", sector: "research", axis: "nouveau", costUsd: 0.84, elapsedS: 74, totalUsd: 0.84 },
  { type: "end", sector: "research", axis: "absent", costUsd: 0.91, elapsedS: 88, totalUsd: 1.75 },
  { type: "end", sector: "research", axis: "neglige", ok: false, costUsd: 0.3, elapsedS: 31, totalUsd: 2.05 },
  { type: "error", sector: "research", axis: "neglige", message: "Limite de débit atteinte (429), nouvel essai dans 30 s" },
  { type: "summary", phase: "research", message: "12 fonctions manquantes identifiées, dont RECHERCHEX, FILTRE et TRIER." },
  { type: "info", sector: "research", message: "Fusion des résultats dans docs/recherche/fonctionnalites.md" },
];
const DONE = [
  ...["nouveau", "absent", "neglige", "mal"].flatMap((axis) => [
    { type: "start", sector: "research", axis }, { type: "end", sector: "research", axis, costUsd: 0.3, elapsedS: 40 },
  ]),
  ...["research", "design", "implementation", "correction"].flatMap((sector, i) => [
    { type: "start", sector }, { type: "end", sector, costUsd: 1.2 + i, elapsedS: 120 + i * 90, totalUsd: 1.2 + i * 2.2 },
  ]),
  { type: "summary", phase: "correction", message: "Tous les tests passent, 3 corrections fusionnées." },
  { type: "done", message: "terminé" },
];

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const [name, events, scheme] of [["en-cours", RUNNING, "light"], ["en-cours", RUNNING, "dark"], ["termine", DONE, "light"]]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, colorScheme: scheme });
  await page.route("**/*", (r) => {
    const p = new URL(r.request().url()).pathname;
    const f = { "/": "panel.html", "/panel.css": "panel.css", "/panel.js": "panel.js" }[p];
    return f ? r.fulfill({ body: readFileSync(join(dir, f)), contentType: f.endsWith("css") ? "text/css" : f.endsWith("js") ? "text/javascript" : "text/html" }) : r.fulfill({ status: 404 });
  });
  await page.addInitScript((evs) => {
    window.EventSource = class { set onmessage(f) { setTimeout(() => evs.forEach((e) => f({ data: JSON.stringify(e) })), 0); } };
  }, events);
  await page.goto("http://localhost/");
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, `${prefix}-${name}-${scheme === "light" ? "clair" : "sombre"}.png`) });
  await page.close();
}
await browser.close();
