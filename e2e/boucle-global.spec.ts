/**
 * Boucle e2e globale (non-regression) : un run complet vu par les trois pages (panneau, moodboard, design).
 * Vrai serveur + vrai git (depot temporaire, distant bare) + faux agents + navigateur reel; aucun jeton.
 * Avec `BOUCLE_SHOTS=1`, ecrit les captures clair/sombre dans docs/screenshots/boucle-e2e/ (`shoot`).
 */
import { expect, test, type Page } from "@playwright/test";
import { startBoucle, type Boucle } from "./boucle/harness";
import { column, openPages, shoot, type Pages } from "./boucle/pages";

const ideas = [
  { title: "Texte en colonnes", source: "Decoupe un texte en colonnes." }, { title: "Tri multiple", source: "Trie sur plusieurs colonnes." },
  { title: "Zoom", source: "Zoome la grille." }, { title: "Courbes de tendance", source: "Trace une tendance." },
];

/** Lignes du journal sans aucun contenu apres l'heure et l'etiquette. */
const emptyLines = (panel: Page) => panel.locator("#log li").evaluateAll((lis) => lis.filter((li) => !(li.children[2]?.textContent ?? "").trim()).length);

/** Titres de toutes les cartes du moodboard, dans toutes les colonnes. */
const titles = async (mood: Page) => (await Promise.all((["idee", "en-cours", "preuves", "termine"] as const).map((c) => column(mood, c)))).flat();

async function boot(ctx: Parameters<typeof openPages>[0], b: Boucle): Promise<Pages> {
  const pages = await openPages(ctx, b.base);
  await pages.panel.setViewportSize({ width: 1200, height: 800 });
  await pages.mood.setViewportSize({ width: 1200, height: 800 });
  await pages.design.setViewportSize({ width: 1200, height: 800 });
  return pages;
}

test("run complet : conflit, carte bloquee puis reprise, les trois pages suivent sans rechargement", async ({ context }) => {
  test.setTimeout(120_000);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const b = await startBoucle({
    ideas,
    script: {
      gate: (w) => (w.startsWith("implementation:") && w.includes("zoom") ? gate : undefined),
      card: (id, n) => (id === "courbes-de-tendance" && n === 0 ? { kind: "blocked" }
        : ["tri-multiple", "zoom"].includes(id) ? { kind: "done", file: "src/shared.ts", text: `export const v = "${id}";\n` } : { kind: "done" }),
    },
  });
  const { panel, mood, design } = await boot(context, b);
  await expect(mood.locator("#progress")).toContainText("0 / 4");
  expect(await column(mood, "idee")).toHaveLength(4);
  await panel.click("#run");

  // en cours (zoom retenu par la porte): deux cartes deja terminees, zoom en cours, la bloquee aussi, sans recharger; le design est a l'ecran
  await expect.poll(() => column(mood, "termine"), { timeout: 25_000 }).toHaveLength(2);
  expect((await column(mood, "en-cours")).sort()).toEqual(["Courbes de tendance", "Zoom"]);
  await expect(mood.locator('#col-en-cours .card.s-bloque')).toHaveCount(1);
  await expect(design.frameLocator("iframe").locator("h1")).toContainText(/\.html/);
  await expect(panel.locator("#now")).toContainText("Implémentation");
  await shoot(panel, "panneau-en-cours"); await shoot(mood, "moodboard-en-cours"); await shoot(design, "design");
  release();

  const done = await b.waitDone(90_000);
  expect(done.complete).toBe(true);
  await expect(panel.locator("#status")).toContainText("Terminé, toutes les cartes");
  await expect.poll(() => column(mood, "termine"), { timeout: 25_000 }).toHaveLength(4);
  await expect(mood.locator("#progress")).toContainText("Boucle terminée · 4 / 4");
  const all = await titles(mood);
  expect(new Set(all).size).toBe(all.length); // aucune carte en double
  expect(await column(mood, "idee")).toEqual([]);
  expect(await panel.locator("#phasebar li.fail, #phasebar li.agent.fail").count()).toBe(0);
  expect(await emptyLines(panel)).toBe(0);
  await shoot(panel, "panneau-fin"); await shoot(mood, "moodboard-fin");

  // git : developpement a tout, origin aussi, master intact, plus aucun worktree
  const dev = (await b.repo.git(["rev-parse", "developpement"])).out.trim();
  expect((await b.repo.git(["rev-parse", "developpement"], b.repo.origin)).out.trim()).toBe(dev);
  expect((await b.repo.git(["worktree", "list"])).out.trim().split("\n")).toHaveLength(1);
  for (const f of ["texte-en-colonnes", "shared", "courbes-de-tendance"]) expect((await b.repo.git(["cat-file", "-e", `developpement:src/${f}.ts`])).code, f).toBe(0);
  expect((await b.repo.git(["log", "master", "--oneline"])).out.trim().split("\n")).toHaveLength(1);
  await b.close();
});

test("budget epuise : le panneau et le moodboard disent pourquoi il reste des cartes", async ({ context }) => {
  test.setTimeout(90_000);
  const b = await startBoucle({ ideas, script: { cost: 0.3, card: () => ({ kind: "wip" }) } }); // plafond 0,20 € : aucune carte ne finit, le budget part
  const { panel, mood } = await boot(context, b);
  await panel.locator("#budgetEur").fill("0.2");
  await panel.click("#run");
  const done = await b.waitDone(60_000);
  expect(done.complete).toBe(false);
  expect(done.reason).toBe("budget");
  await expect(panel.locator("#status")).toContainText("Budget épuisé, cartes restantes");
  await expect(mood.locator("#progress")).toContainText("Boucle non terminée", { timeout: 25_000 });
  await b.close();
});

test("arret puis reprise : rien n'est perdu, la boucle repart et finit", async ({ context }) => {
  test.setTimeout(120_000);
  let hold = true;
  const gate = new Promise<void>(() => { /* jamais resolu : seul Stop libere l'agent */ });
  const b = await startBoucle({ ideas, script: { gate: (w) => (hold && w.startsWith("implementation:") && w.includes("zoom") ? gate : undefined) } });
  const { panel, mood } = await boot(context, b);
  await panel.click("#run");
  await expect.poll(() => column(mood, "termine"), { timeout: 25_000 }).toHaveLength(3);
  await panel.click("#run"); // Stop
  const stopped = await b.waitDone(60_000);
  expect(stopped.message).toBe("arrêté");
  await expect(panel.locator("#status")).toContainText("Arrêté");
  await expect(panel.locator("#run")).toHaveText("Go");
  await expect(mood.locator("#progress")).toContainText("Boucle non terminée", { timeout: 25_000 });
  await expect.poll(() => column(mood, "termine"), { timeout: 25_000 }).toHaveLength(3);
  expect((await b.repo.git(["worktree", "list"])).out.trim().split("\n").length).toBeLessThanOrEqual(2); // l'agent interrompu n'a rien commite
  hold = false;
  await panel.click("#run"); // reprise
  const end = await b.waitDone(60_000);
  expect(end.complete).toBe(true);
  await expect(mood.locator("#progress")).toContainText("Boucle terminée · 4 / 4", { timeout: 25_000 });
  const all = await titles(mood);
  expect(new Set(all).size).toBe(4);
  await expect(panel.locator("#status")).toContainText("Terminé, toutes les cartes");
  await b.close();
});
